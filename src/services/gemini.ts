import { z } from "zod";

import type { TargetLanguageCode } from "@/constants/languages";
import { logError } from "@/services/logger";
import { getDeviceId } from "@/services/preferences";
import type { ImageAnalysisResult } from "@/types/vocabulary";

// The Gemini key lives in the Cloudflare Worker (see worker/snapvocab-proxy.js),
// never in the app: EXPO_PUBLIC_* variables are bundled into the build and can
// be extracted from it. The app only ships the proxy URL, which is harmless.

const REQUEST_TIMEOUT_MS = 45_000;
const MAX_ITEMS = 5;

export type AnalysisErrorCode =
  | "CONFIG"
  | "NETWORK"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "OVERLOADED"
  | "API"
  | "PARSE"
  | "EMPTY";

/** Vietnamese copy shown by ErrorState, keyed by the code the proxy returns. */
const ERROR_MESSAGES: Record<AnalysisErrorCode, string> = {
  CONFIG: "Thiếu cấu hình EXPO_PUBLIC_API_URL. Vui lòng kiểm tra file .env.",
  NETWORK: "Vui lòng kiểm tra kết nối mạng và thử lại.",
  TIMEOUT: "Máy chủ phản hồi quá lâu. Vui lòng thử lại.",
  RATE_LIMIT: "Bạn đã dùng hết lượt phân tích. Vui lòng thử lại sau.",
  OVERLOADED: "Hệ thống đang quá tải. Vui lòng thử lại sau vài giây.",
  API: "Không thể phân tích ảnh lúc này.",
  PARSE: "Không thể phân tích ảnh lúc này.",
  EMPTY:
    "SnapVocab chưa nhận ra vật thể rõ ràng trong ảnh này. Hãy thử một bức ảnh khác.",
};

export class AnalysisError extends Error {
  code: AnalysisErrorCode;
  /** Seconds to wait before retrying, when the proxy says so. */
  retryAfterSeconds?: number;

  constructor(
    code: AnalysisErrorCode,
    message: string,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const vocabularyItemSchema = z.object({
  word: z.string().min(1),
  reading: z.string().min(1),
  vietnamese: z.string().min(1),
  example: z.string().min(1),
  example_vi: z.string().min(1),
});

const analysisResponseSchema = z.object({
  full_narrative: z.string(),
  items: z.array(vocabularyItemSchema),
});

const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string().optional(),
    retry_after: z.number().optional(),
  }),
});

function isAnalysisErrorCode(value: string): value is AnalysisErrorCode {
  return value in ERROR_MESSAGES;
}

/** Maps a status to a code for responses that are not our JSON envelope. */
function codeForStatus(status: number): AnalysisErrorCode {
  if (status === 429) return "RATE_LIMIT";
  if (status === 503) return "OVERLOADED";
  return "API";
}

/**
 * Turns a failed response into an AnalysisError.
 *
 * The body is not always our envelope: Cloudflare's own rate limiting and
 * error pages return HTML, so every parse step here has to tolerate garbage
 * and fall back to the status code.
 */
async function toAnalysisError(response: Response): Promise<AnalysisError> {
  let body: unknown;
  try {
    body = JSON.parse(await response.text());
  } catch {
    body = null;
  }

  const envelope = errorEnvelopeSchema.safeParse(body);
  if (!envelope.success) {
    const code = codeForStatus(response.status);
    logError("gemini.httpError", `HTTP ${response.status}`, {
      status: response.status,
    });
    return new AnalysisError(code, ERROR_MESSAGES[code]);
  }

  const { code, message, retry_after: retryAfter } = envelope.data.error;
  logError("gemini.httpError", `HTTP ${response.status}`, {
    status: response.status,
    code,
  });
  // console.log("response:", JSON.stringify(response));
  // Known codes use the app's own copy so it stays consistent and translatable;
  // an unknown code falls back to whatever text the proxy sent, which lets the
  // wording change server-side without shipping a new build.
  const resolved = isAnalysisErrorCode(code)
    ? code
    : codeForStatus(response.status);
  const text = isAnalysisErrorCode(code)
    ? ERROR_MESSAGES[resolved]
    : (message ?? ERROR_MESSAGES[resolved]);

  return new AnalysisError(resolved, text, retryAfter);
}

/**
 * Sends the processed image to the SnapVocab proxy and returns validated
 * vocabulary items for the chosen target language.
 *
 * The body is the raw base64 string (content-type: text/plain) rather than
 * JSON, so the Worker never has to parse a ~400KB payload.
 */
export async function analyzeImage(
  base64: string,
  language: TargetLanguageCode,
): Promise<ImageAnalysisResult> {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new AnalysisError("CONFIG", ERROR_MESSAGES.CONFIG);
  }

  const endpoint = `${apiUrl.replace(/\/+$/, "")}/analyze?lang=${language}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "text/plain",
        "x-device-id": getDeviceId(),
      },
      body: base64,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      logError("gemini.timeout", err);
      throw new AnalysisError("TIMEOUT", ERROR_MESSAGES.TIMEOUT);
    }
    logError("gemini.network", err);
    throw new AnalysisError("NETWORK", ERROR_MESSAGES.NETWORK);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw await toAnalysisError(response);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (err) {
    logError("gemini.parseBody", err);
    throw new AnalysisError("PARSE", ERROR_MESSAGES.PARSE);
  }

  const parsed = analysisResponseSchema.safeParse(payload);
  if (!parsed.success) {
    logError("gemini.schemaValidation", parsed.error.message);
    throw new AnalysisError("PARSE", ERROR_MESSAGES.PARSE);
  }

  if (parsed.data.items.length === 0) {
    throw new AnalysisError("EMPTY", ERROR_MESSAGES.EMPTY);
  }

  const quotaHeader = response.headers.get("x-quota-remaining");
  const quotaRemaining = quotaHeader === null ? undefined : Number(quotaHeader);

  return {
    language,
    full_narrative: parsed.data.full_narrative,
    items: parsed.data.items.slice(0, MAX_ITEMS),
    quotaRemaining: Number.isFinite(quotaRemaining)
      ? quotaRemaining
      : undefined,
  };
}
