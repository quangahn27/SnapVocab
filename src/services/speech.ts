import * as Speech from 'expo-speech';

import type { VocabularyItem } from '@/types/vocabulary';

const ORDINAL_LABELS_VI = ['Từ đầu tiên.', 'Từ thứ hai.', 'Từ thứ ba.', 'Từ thứ tư.', 'Từ thứ năm.'];

// Bumped every time playback is stopped/restarted so an in-flight speakAll()
// sequence knows to stop chaining instead of talking over a newer request.
let generation = 0;

function speak(text: string, language: 'en-US' | 'vi-VN'): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, {
      language,
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: (err) => {
        console.error('Speech playback error', err);
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

/** Speaks a single English word or sentence, interrupting anything currently playing. */
export function speakEnglish(text: string) {
  generation += 1;
  Speech.stop();
  Speech.speak(text, { language: 'en-US' });
}

/** Speaks a single Vietnamese phrase, interrupting anything currently playing. */
export function speakVietnamese(text: string) {
  generation += 1;
  Speech.stop();
  Speech.speak(text, { language: 'vi-VN' });
}

type SpeechStep = [string, 'en-US' | 'vi-VN'];

function itemSteps(item: VocabularyItem, introLabel?: string): SpeechStep[] {
  const steps: SpeechStep[] = [];
  if (introLabel) steps.push([introLabel, 'vi-VN']);
  steps.push(
    [item.english, 'en-US'],
    [item.vietnamese, 'vi-VN'],
    [item.example_en, 'en-US'],
    [item.example_vi, 'vi-VN'],
  );
  return steps;
}

async function runSequence(steps: SpeechStep[], myGeneration: number) {
  for (const [text, language] of steps) {
    if (myGeneration !== generation) return;
    await speak(text, language);
  }
}

/** Speaks the full word → meaning → example → translation sequence for one item. */
export async function speakVocabularyItem(item: VocabularyItem, introLabel?: string) {
  const myGeneration = ++generation;
  Speech.stop();
  await runSequence(itemSteps(item, introLabel), myGeneration);
}

/** Plays the "Nghe toàn bộ" sequence: every vocabulary item, one after another. */
export async function speakAll(items: VocabularyItem[]) {
  const myGeneration = ++generation;
  Speech.stop();

  for (let i = 0; i < items.length; i += 1) {
    if (myGeneration !== generation) return;
    const label = ORDINAL_LABELS_VI[i] ?? `Từ số ${i + 1}.`;
    await runSequence(itemSteps(items[i], label), myGeneration);
  }
}
