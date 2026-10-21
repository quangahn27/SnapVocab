import * as Speech from 'expo-speech';

import { VIETNAMESE_SPEECH_LANGUAGE } from '@/constants/languages';
import { logError } from '@/services/logger';
import type { VocabularyItem } from '@/types/vocabulary';

const ORDINAL_LABELS_VI = ['Từ đầu tiên.', 'Từ thứ hai.', 'Từ thứ ba.', 'Từ thứ tư.', 'Từ thứ năm.'];

/** Some Android engines report ISO 639-2 codes ("jpn-JPN") instead of "ja-JP". */
const ISO3_TO_ISO2: Record<string, string> = {
  eng: 'en',
  jpn: 'ja',
  kor: 'ko',
  zho: 'zh',
  cmn: 'zh',
  vie: 'vi',
};

// Bumped every time playback is stopped/restarted so an in-flight speakAll()
// sequence knows to stop chaining instead of talking over a newer request.
let generation = 0;

let availableLanguages: Promise<Set<string>> | null = null;

/** Reduces a voice/language tag to a bare ISO 639-1 code: "ja_JP" -> "ja". */
function normalizeLanguageTag(tag: string): string {
  const base = tag.toLowerCase().replace(/_/g, '-').split('-')[0];
  return ISO3_TO_ISO2[base] ?? base;
}

async function loadAvailableLanguages(): Promise<Set<string>> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    return new Set(voices.map((voice) => normalizeLanguageTag(voice.language)));
  } catch (err) {
    logError('speech.voices', err);
    return new Set();
  }
}

/**
 * Whether the device can actually speak a language.
 *
 * expo-speech does not define what happens when a requested language has no
 * voice installed — on Android the target language often needs an extra voice
 * download — so callers hide their speaker buttons instead of playing silence
 * or reading foreign text with a Vietnamese voice. An empty voice list means
 * the platform told us nothing, so assume it is supported rather than disable playback.
 */
export async function isLanguageSupported(speechLanguage: string): Promise<boolean> {
  availableLanguages ??= loadAvailableLanguages();
  const languages = await availableLanguages;
  if (languages.size === 0) return true;
  return languages.has(normalizeLanguageTag(speechLanguage));
}

function speak(text: string, language: string): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, {
      language,
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: (err) => {
        logError('speech.playback', err);
        resolve();
      },
    });
  });
}

/** Stops any speech currently playing or queued. */
export function stopSpeaking() {
  generation += 1;
  Speech.stop();
}

/** Speaks one word or sentence, interrupting anything currently playing. */
export function speakText(text: string, language: string) {
  generation += 1;
  Speech.stop();
  Speech.speak(text, { language });
}

type SpeechStep = [text: string, language: string];

/**
 * Builds the word -> meaning -> example -> translation sequence.
 *
 * `item.reading` is never spoken: it is a romanization for the eyes, and a
 * text-to-speech engine fed "shūbāo" or "kasa" produces nonsense. The engine
 * always gets `item.word` in its own script.
 */
function itemSteps(
  item: VocabularyItem,
  speechLanguage: string,
  introLabel?: string,
): SpeechStep[] {
  const steps: SpeechStep[] = [];
  if (introLabel) steps.push([introLabel, VIETNAMESE_SPEECH_LANGUAGE]);
  steps.push(
    [item.word, speechLanguage],
    [item.vietnamese, VIETNAMESE_SPEECH_LANGUAGE],
    [item.example, speechLanguage],
    [item.example_vi, VIETNAMESE_SPEECH_LANGUAGE],
  );
  return steps;
}

async function runSequence(steps: SpeechStep[], myGeneration: number) {
  for (const [text, language] of steps) {
    if (myGeneration !== generation) return;
    await speak(text, language);
  }
}

/** Plays the "Nghe toàn bộ" sequence: every vocabulary item, one after another. */
export async function speakAll(items: VocabularyItem[], speechLanguage: string) {
  const myGeneration = ++generation;
  Speech.stop();

  for (let i = 0; i < items.length; i += 1) {
    if (myGeneration !== generation) return;
    const label = ORDINAL_LABELS_VI[i] ?? `Từ số ${i + 1}.`;
    await runSequence(itemSteps(items[i], speechLanguage, label), myGeneration);
  }
}
