/**
 * Languages SnapVocab can teach. The explanation language is always Vietnamese —
 * only the target language changes, so the app UI itself needs no translation.
 */
export type TargetLanguageCode = 'en' | 'ja' | 'ko' | 'zh';

export type TargetLanguage = {
  code: TargetLanguageCode;
  /** Vietnamese label shown in the picker. */
  label: string;
  /**
   * One or two characters of the language's own writing system, shown as the
   * badge in the picker. It replaces a flag emoji: flags render differently on
   * every device, no icon font carries them, and a country is not a language —
   * whereas the script is exactly what the learner is about to read.
   */
  script: string;
  /** BCP-47 tag passed to expo-speech for this language. */
  speechLanguage: string;
  /**
   * False when the writing system is not Latin. Those learners cannot read the
   * word itself yet, so `reading` carries the pronunciation they actually use
   * and must be displayed just as prominently as the word.
   */
  latinScript: boolean;
};

export const TARGET_LANGUAGES: readonly TargetLanguage[] = [
  { code: 'en', label: 'Tiếng Anh', script: 'Aa', speechLanguage: 'en-US', latinScript: true },
  { code: 'ja', label: 'Tiếng Nhật', script: 'あ', speechLanguage: 'ja-JP', latinScript: false },
  { code: 'ko', label: 'Tiếng Hàn', script: '가', speechLanguage: 'ko-KR', latinScript: false },
  { code: 'zh', label: 'Tiếng Trung', script: '中', speechLanguage: 'zh-CN', latinScript: false },
];

export const DEFAULT_TARGET_LANGUAGE: TargetLanguageCode = 'en';

/** Explanations, meanings and the narration are always spoken in Vietnamese. */
export const VIETNAMESE_SPEECH_LANGUAGE = 'vi-VN';

export function isTargetLanguageCode(value: unknown): value is TargetLanguageCode {
  return TARGET_LANGUAGES.some((language) => language.code === value);
}

export function getTargetLanguage(code: TargetLanguageCode): TargetLanguage {
  return TARGET_LANGUAGES.find((language) => language.code === code) ?? TARGET_LANGUAGES[0];
}
