import { File, Paths } from 'expo-file-system';

import {
  DEFAULT_TARGET_LANGUAGE,
  isTargetLanguageCode,
  type TargetLanguageCode,
} from '@/constants/languages';
import { logError } from '@/services/logger';

const SETTINGS_FILE_NAME = 'snapvocab-settings.json';

type Settings = {
  /** Random per-install id the proxy uses to meter daily usage. */
  deviceId: string;
  language: TargetLanguageCode;
};

let cached: Settings | null = null;

/**
 * UUID v4 shape from Math.random. This only labels an install for quota
 * counting, so it does not need cryptographic randomness — and avoiding
 * expo-crypto keeps the dependency list as is.
 */
function createDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getSettingsFile(): File {
  return new File(Paths.document, SETTINGS_FILE_NAME);
}

function persist(settings: Settings) {
  try {
    const file = getSettingsFile();
    if (!file.exists) file.create();
    file.write(JSON.stringify(settings));
  } catch (err) {
    logError('preferences.write', err);
  }
}

/**
 * Loads settings once per app session. Any failure falls back to fresh
 * in-memory defaults — preferences must never block the main flow.
 */
function load(): Settings {
  if (cached) return cached;

  let settings: Settings = { deviceId: createDeviceId(), language: DEFAULT_TARGET_LANGUAGE };

  try {
    const file = getSettingsFile();
    if (file.exists) {
      const parsed: unknown = JSON.parse(file.textSync());
      if (parsed && typeof parsed === 'object') {
        const stored = parsed as Partial<Settings>;
        if (typeof stored.deviceId === 'string' && stored.deviceId.length > 0) {
          settings.deviceId = stored.deviceId;
        }
        if (isTargetLanguageCode(stored.language)) {
          settings.language = stored.language;
        }
      }
    }
  } catch (err) {
    logError('preferences.read', err);
    settings = { deviceId: createDeviceId(), language: DEFAULT_TARGET_LANGUAGE };
  }

  cached = settings;
  persist(settings);
  return settings;
}

export function getDeviceId(): string {
  return load().deviceId;
}

export function getPreferredLanguage(): TargetLanguageCode {
  return load().language;
}

export function setPreferredLanguage(language: TargetLanguageCode) {
  const settings = { ...load(), language };
  cached = settings;
  persist(settings);
}
