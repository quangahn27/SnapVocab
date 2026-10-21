/**
 * SnapVocab proxy — Cloudflare Worker.
 *
 * The app never holds the Gemini API key: it POSTs the base64 JPEG here and
 * this Worker adds the key, the model and the prompt before calling Gemini.
 *
 * Deploy: paste this file into the Cloudflare dashboard editor for the
 * `snapvocab-proxy` Worker, then Deploy. It is kept in the repo so the proxy
 * is version-controlled alongside the app that depends on it.
 *
 * Required bindings (Settings -> Variables and Secrets):
 *   GEMINI_API_KEY  Secret  the Google AI Studio key
 *   GEMINI_MODEL    Text    e.g. gemini-3.6-flash
 * Optional:
 *   DAILY_QUOTA     Text    per-device analyses per day (default 50)
 *   QUOTA           KV namespace binding; without it quota is simply not enforced
 *
 * Endpoint: POST /analyze?lang=en|ja|ko|zh
 *   headers: content-type: text/plain, x-device-id: <uuid>
 *   body:    raw base64 of a JPEG (NOT wrapped in JSON — parsing a 400KB
 *            string would eat into the 10ms CPU budget of the free plan)
 *   200:     { full_narrative, items: [{ word, reading, vietnamese, example, example_vi }] }
 *   error:   { error: { code, message, retry_after? } }
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_BODY_BYTES = 1_500_000;
const MAX_ITEMS = 5;
const DEFAULT_DAILY_QUOTA = 50;

// Gemini returns 503 "high demand" fairly often for flash models; one quick
// retry usually succeeds and saves the user from seeing an error screen.
const RETRY_STATUSES = [500, 502, 503, 504];
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const LANGUAGES = {
  en: {
    name: 'English',
    viName: 'tiếng Anh',
    wordRule: 'the English word.',
    readingRule: 'the IPA transcription between / /, using American English pronunciation.',
    levelRule: 'Keep it easy for CEFR A1-A2 learners when possible.',
    narrationRule: '',
  },
  ja: {
    name: 'Japanese',
    viName: 'tiếng Nhật',
    wordRule: 'the Japanese word in its normal written form (kanji with kana where appropriate).',
    readingRule: 'Hepburn romaji followed by the kana reading in parentheses, e.g. "kasa (かさ)".',
    levelRule: 'Keep vocabulary and grammar around JLPT N5-N4.',
    narrationRule:
      'Japanese does not use the Latin alphabet, so in the narration always write a word as "<japanese> (<romaji>)" so a beginner can read it.',
  },
  ko: {
    name: 'Korean',
    viName: 'tiếng Hàn',
    wordRule: 'the Korean word in Hangul.',
    readingRule: 'Revised Romanization of Korean, e.g. "usan".',
    levelRule: 'Keep vocabulary and grammar around TOPIK level 1.',
    narrationRule:
      'Korean does not use the Latin alphabet, so in the narration always write a word as "<hangul> (<romanization>)" so a beginner can read it.',
  },
  zh: {
    name: 'Chinese (Simplified)',
    viName: 'tiếng Trung',
    wordRule: 'the Simplified Chinese word.',
    readingRule: 'Hanyu Pinyin with tone marks, e.g. "shūbāo".',
    levelRule: 'Keep vocabulary and grammar around HSK 1-2.',
    narrationRule:
      'Chinese does not use the Latin alphabet, so in the narration always write a word as "<hanzi> (<pinyin>)" so a beginner can read it.',
  },
};

function buildPrompt(code) {
  const lang = LANGUAGES[code];

  return `You are a ${lang.name} vocabulary tutor for Vietnamese learners.

Analyze the provided image and identify the most useful clearly visible physical objects for a ${lang.name} learner.

Rules:

1. Identify 3 to 5 prominent objects when possible.
2. If fewer than 3 objects are clearly visible, return only the objects you can confidently identify. Never invent objects merely to reach the minimum.
3. Maximum 5 objects.
4. Only identify objects that are directly visible in the image.
5. Do not guess objects that are hidden, unclear, ambiguous, or implied.
6. Prefer common everyday nouns that are useful for beginners.
7. Avoid duplicate concepts.
8. Avoid overly generic words such as "thing", "object", "stuff", or "equipment" when a more useful concrete noun is available.
9. Use natural everyday ${lang.name} vocabulary.
10. Do not identify people by identity.
11. If a person appears in the image, focus on visible objects around them rather than identifying the person.
12. Do not include Markdown.
13. Do not include explanations outside the requested structured response.

Field rules:

- "word": ${lang.wordRule}
- "reading": ${lang.readingRule}
- "vietnamese": the natural Vietnamese meaning, not a literal machine translation.
- "example": one short, natural sentence in ${lang.name} that clearly demonstrates the meaning of the word. ${lang.levelRule}
- "example_vi": a Vietnamese translation that preserves the meaning of "example".

full_narrative requirements:

Write a short, natural Vietnamese narration covering all vocabulary items, concise and suitable for text-to-speech.

Style: "Trong ảnh tôi thấy một chiếc laptop. Trong ${lang.viName}, máy tính xách tay là laptop. Ví dụ: I use my laptop every day. Tiếp theo là..."
${lang.narrationRule}`;
}

/**
 * Subset of JSON Schema accepted by Gemini's `generationConfig.responseSchema`.
 * Gemini's dialect has no `additionalProperties`, so the app re-validates the
 * item shape with zod after parsing (see src/services/gemini.ts).
 */
const ANALYSIS_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    full_narrative: {
      type: 'string',
      description: 'Vietnamese narration summarizing all vocabulary items.',
    },
    items: {
      type: 'array',
      maxItems: MAX_ITEMS,
      items: {
        type: 'object',
        properties: {
          word: { type: 'string' },
          reading: { type: 'string' },
          vietnamese: { type: 'string' },
          example: { type: 'string' },
          example_vi: { type: 'string' },
        },
        required: ['word', 'reading', 'vietnamese', 'example', 'example_vi'],
      },
    },
  },
  required: ['full_narrative', 'items'],
};

function fail(status, code, message, extra = {}) {
  return json({ error: { code, message, ...extra } }, status);
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

function secondsUntilUtcMidnight() {
  const now = new Date();
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((midnight - now.getTime()) / 1000));
}

/**
 * Counts one analysis against the device's daily allowance.
 * KV is eventually consistent, so a device racing requests can slip a few over
 * the limit — acceptable for abuse control, which only needs the right order
 * of magnitude. Without a QUOTA binding this is a no-op, so the Worker keeps
 * working before the KV namespace is created.
 */
async function consumeQuota(env, deviceId) {
  if (!env.QUOTA || !deviceId) return { allowed: true, remaining: null };

  const limit = Number(env.DAILY_QUOTA) || DEFAULT_DAILY_QUOTA;
  const key = `q:${deviceId}:${new Date().toISOString().slice(0, 10)}`;

  let used = 0;
  try {
    used = Number(await env.QUOTA.get(key)) || 0;
  } catch (err) {
    console.log('quota.read', String(err));
    return { allowed: true, remaining: null };
  }

  if (used >= limit) {
    return { allowed: false, remaining: 0, retryAfter: secondsUntilUtcMidnight() };
  }

  try {
    // 2 days of TTL so the counter disappears on its own after the day rolls over.
    await env.QUOTA.put(key, String(used + 1), { expirationTtl: 172800 });
  } catch (err) {
    console.log('quota.write', String(err));
  }

  return { allowed: true, remaining: limit - used - 1 };
}

/** Reads Gemini's suggested retry delay ("retryDelay": "27s") out of an error body. */
function retryAfterFromGemini(body) {
  const match = /"retryDelay"\s*:\s*"(\d+)s"/.exec(body);
  return match ? Number(match[1]) : null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Calls Gemini, retrying the transient overload statuses a couple of times. */
async function callGemini(env, prompt, base64) {
  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/jpeg', data: base64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: ANALYSIS_RESPONSE_SCHEMA,
    },
  });

  let lastResponse = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) await sleep(RETRY_DELAY_MS);

    const response = await fetch(
      `${GEMINI_API_BASE}/models/${env.GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY,
        },
        body,
      },
    );

    if (response.ok || !RETRY_STATUSES.includes(response.status)) return response;

    console.log('gemini.retry', response.status, `attempt ${attempt + 1}`);
    lastResponse = response;
  }

  return lastResponse;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      return new Response('snapvocab-proxy OK', { status: 200 });
    }
    if (url.pathname !== '/analyze') {
      return fail(404, 'API', 'Không tìm thấy endpoint.');
    }
    if (request.method !== 'POST') {
      return fail(405, 'API', 'Phương thức không được hỗ trợ.');
    }

    const lang = url.searchParams.get('lang') || 'en';
    if (!LANGUAGES[lang]) {
      return fail(400, 'API', 'Ngôn ngữ không được hỗ trợ.');
    }

    const base64 = (await request.text()).trim();
    if (!base64) return fail(400, 'API', 'Thiếu dữ liệu ảnh.');
    if (base64.length > MAX_BODY_BYTES) {
      return fail(413, 'API', 'Ảnh quá lớn, vui lòng thử ảnh khác.');
    }

    const quota = await consumeQuota(env, request.headers.get('x-device-id'));
    if (!quota.allowed) {
      return fail(429, 'RATE_LIMIT', 'Bạn đã dùng hết lượt phân tích hôm nay.', {
        retry_after: quota.retryAfter,
      });
    }

    let res;
    try {
      res = await callGemini(env, buildPrompt(lang), base64);
    } catch (err) {
      console.log('gemini.network', String(err));
      return fail(502, 'NETWORK', 'Vui lòng kiểm tra kết nối mạng và thử lại.');
    }

    if (res.status === 429) {
      // Gemini's 429 body names which quota was hit and how long to wait; without
      // logging it a rate limit is indistinguishable from any other throttling.
      const detail = await res.text();
      console.log('gemini.rateLimit', detail.slice(0, 600));
      return fail(429, 'RATE_LIMIT', 'SnapVocab đang có quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.', {
        retry_after: retryAfterFromGemini(detail) ?? 60,
      });
    }
    if (RETRY_STATUSES.includes(res.status)) {
      console.log('gemini.overloaded', res.status);
      return fail(503, 'OVERLOADED', 'Hệ thống đang quá tải. Vui lòng thử lại sau vài giây.', {
        retry_after: 10,
      });
    }
    if (!res.ok) {
      console.log('gemini.http', res.status, await res.text());
      return fail(502, 'API', 'Không thể phân tích ảnh lúc này.');
    }

    const payload = await res.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.log('gemini.missingText', JSON.stringify(payload).slice(0, 500));
      return fail(502, 'PARSE', 'Không thể phân tích ảnh lúc này.');
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.log('gemini.parseText', String(err));
      return fail(502, 'PARSE', 'Không thể phân tích ảnh lúc này.');
    }

    const headers = {};
    if (quota.remaining !== null) headers['x-quota-remaining'] = String(quota.remaining);

    return json(parsed, 200, headers);
  },
};
