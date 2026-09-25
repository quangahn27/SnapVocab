import { File, Paths } from 'expo-file-system';

const LOG_FILE_NAME = 'snapvocab-error-log.txt';
const MAX_LOG_SIZE_BYTES = 256 * 1024;

function getLogFile(): File {
  return new File(Paths.document, LOG_FILE_NAME);
}

/**
 * Logs an error to the console and appends it to a local log file
 * (`documentDirectory/snapvocab-error-log.txt`) so it survives past the
 * current app/Metro session. Never throws — logging must not break the
 * calling flow.
 *
 * Uses `console.warn`, not `console.error`: every call site has already
 * caught the failure and shown the user a graceful error screen, so this
 * is a handled/expected case — it doesn't need RN's full-screen LogBox
 * redbox, just a non-blocking dev-visible warning.
 */
export function logError(scope: string, detail: unknown, meta?: Record<string, unknown>) {
  console.warn(`[${scope}]`, detail, meta ?? '');

  try {
    const file = getLogFile();
    if (!file.exists) {
      file.create();
    } else if (file.size > MAX_LOG_SIZE_BYTES) {
      file.write(''); // reset before the log grows unbounded
    }

    const message = detail instanceof Error ? detail.message : String(detail);
    const line = JSON.stringify({ time: new Date().toISOString(), scope, message, ...meta });
    file.write(`${line}\n`, { append: true });
  } catch (loggingError) {
    console.error('Failed to write error log:', loggingError);
  }
}

/** Returns the full contents of the local error log, or null if none exists yet. */
export function readErrorLog(): string | null {
  try {
    const file = getLogFile();
    return file.exists ? file.textSync() : null;
  } catch {
    return null;
  }
}

/** Deletes the local error log file, if present. */
export function clearErrorLog() {
  try {
    const file = getLogFile();
    if (file.exists) file.delete();
  } catch (err) {
    console.error('Failed to clear error log:', err);
  }
}
