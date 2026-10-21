import type { TargetLanguageCode } from '@/constants/languages';

/**
 * One vocabulary item. Field names are language-neutral: `word` holds the term
 * in its own script (laptop / 书包 / かさ / 우산) and `reading` the pronunciation
 * a Vietnamese learner can actually read (IPA, Pinyin, romaji, romanization).
 * `reading` is for the eyes only — never send it to text-to-speech.
 */
export type VocabularyItem = {
  word: string;
  reading: string;
  vietnamese: string;
  example: string;
  example_vi: string;
};

export type ImageAnalysisResult = {
  /** Target language this result was produced for. */
  language: TargetLanguageCode;
  full_narrative: string;
  items: VocabularyItem[];
  /** Analyses left today, when the proxy reports a quota. */
  quotaRemaining?: number;
};
