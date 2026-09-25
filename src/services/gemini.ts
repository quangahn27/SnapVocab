import { z } from 'zod';

import { ANALYSIS_PROMPT, ANALYSIS_RESPONSE_SCHEMA } from '@/constants/analysisPrompt';
import { logError } from '@/services/logger';
import type { ImageAnalysisResult } from '@/types/vocabulary';

// NOTE (MVP only): the Gemini API is called directly from the mobile app using
// EXPO_PUBLIC_GEMINI_API_KEY. Any `EXPO_PUBLIC_*` variable is bundled into the
// app and can be extracted from the production build, so this key is NOT safe
// for a real production release — it belongs behind a backend proxy. This is
// an accepted tradeoff for the prototype stage only.

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_ITEMS = 5;

export type AnalysisErrorCode =
  | 'CONFIG'
  | 'NETWORK'
  | 'RATE_LIMIT'
  | 'API'
  | 'PARSE'
  | 'EMPTY';

export class AnalysisError extends Error {
  code: AnalysisErrorCode;

  constructor(code: AnalysisErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const vocabularyItemSchema = z.object({
  english: z.string().min(1),
  phonetic: z.string().min(1),
  vietnamese: z.string().min(1),
  example_en: z.string().min(1),
  example_vi: z.string().min(1),
});

const imageAnalysisResultSchema = z.object({
  full_narrative: z.string(),
  items: z.array(vocabularyItemSchema),
});

/** Sends the processed image to Gemini and returns validated vocabulary items. */
export async function analyzeImage(base64: string, mimeType: string): Promise<ImageAnalysisResult> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const model = process.env.EXPO_PUBLIC_GEMINI_MODEL;

  if (!apiKey) {
    throw new AnalysisError(
      'CONFIG',
      'Thiếu cấu hình EXPO_PUBLIC_GEMINI_API_KEY. Vui lòng kiểm tra file .env.',
    );
  }
  if (!model) {
    throw new AnalysisError(
      'CONFIG',
      'Thiếu cấu hình EXPO_PUBLIC_GEMINI_MODEL. Vui lòng kiểm tra file .env.',
    );
  }

  let response: Response;
  try {
    response = await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: ANALYSIS_PROMPT },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: ANALYSIS_RESPONSE_SCHEMA,
        },
      }),
    });
  } catch (err) {
    logError('gemini.network', err);
    throw new AnalysisError('NETWORK', 'Vui lòng kiểm tra kết nối mạng và thử lại.');
  }

  if (!response.ok) {
    if (response.status === 429) {
      logError('gemini.rateLimit', 'HTTP 429', { status: response.status });
      throw new AnalysisError('RATE_LIMIT', 'SnapVocab đang có quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.');
    }
    logError('gemini.httpError', `HTTP ${response.status}`, { status: response.status });
    throw new AnalysisError('API', 'Không thể phân tích ảnh lúc này.');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (err) {
    logError('gemini.parseEnvelope', err);
    throw new AnalysisError('PARSE', 'Không thể phân tích ảnh lúc này.');
  }

  const text = extractResponseText(payload);
  if (!text) {
    logError('gemini.missingText', 'Gemini response missing text content.');
    throw new AnalysisError('PARSE', 'Không thể phân tích ảnh lúc này.');
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch (err) {
    logError('gemini.parseText', err);
    throw new AnalysisError('PARSE', 'Không thể phân tích ảnh lúc này.');
  }

  const parsed = imageAnalysisResultSchema.safeParse(parsedJson);
  if (!parsed.success) {
    logError('gemini.schemaValidation', parsed.error.message);
    throw new AnalysisError('PARSE', 'Không thể phân tích ảnh lúc này.');
  }

  if (parsed.data.items.length === 0) {
    throw new AnalysisError(
      'EMPTY',
      'SnapVocab chưa nhận ra vật thể rõ ràng trong ảnh này. Hãy thử một bức ảnh khác.',
    );
  }

  return {
    full_narrative: parsed.data.full_narrative,
    items: parsed.data.items.slice(0, MAX_ITEMS),
  };
}

function extractResponseText(payload: unknown): string | null {
  const candidates = z
    .object({
      candidates: z
        .array(
          z.object({
            content: z.object({
              parts: z.array(z.object({ text: z.string().optional() })).optional(),
            }).optional(),
          }),
        )
        .optional(),
    })
    .safeParse(payload);

  if (!candidates.success) return null;
  const text = candidates.data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ?? null;
}
