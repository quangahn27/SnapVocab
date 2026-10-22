import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { SnapVocabColors, SnapVocabGradients, SnapVocabShadows } from '@/constants/colors';
import type { TargetLanguage } from '@/constants/languages';
import type { VocabularyItem } from '@/types/vocabulary';

type VocabularyCardProps = {
  item: VocabularyItem;
  language: TargetLanguage;
  /** Position in the result list, shown in the badge. 1-based. */
  index: number;
  onSpeakWord: (text: string) => void;
  onSpeakExample: (text: string) => void;
  /** Hides the speaker buttons when the device has no voice for this language. */
  speechAvailable?: boolean;
};

function SpeakerButton({ onPress, accessibilityLabel }: { onPress: () => void; accessibilityLabel: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [styles.speakerButton, pressed && styles.speakerButtonPressed]}>
      <Icon name="volume-up" size={20} color={SnapVocabColors.primary} />
    </Pressable>
  );
}

export function VocabularyCard({
  item,
  language,
  index,
  onSpeakWord,
  onSpeakExample,
  speechAvailable = true,
}: VocabularyCardProps) {
  // For Japanese/Korean/Chinese the learner cannot read the word itself yet, so
  // the reading carries the pronunciation and must not be a dim footnote the
  // way IPA can be under an English word.
  const readingStyle = language.latinScript ? styles.reading : styles.readingProminent;

  return (
    <View style={styles.card}>
      <View style={styles.wordRow}>
        <View style={styles.indexBadge}>
          <Text style={styles.indexLabel}>{index}</Text>
        </View>
        <View style={styles.wordColumn}>
          <Text style={styles.word}>{item.word}</Text>
          <Text style={readingStyle}>{item.reading}</Text>
        </View>
        {speechAvailable && (
          <SpeakerButton
            onPress={() => onSpeakWord(item.word)}
            accessibilityLabel={`Nghe từ ${item.word}`}
          />
        )}
      </View>

      <Text style={styles.vietnamese}>{item.vietnamese}</Text>

      <View style={styles.exampleBlock}>
        <View style={styles.exampleColumn}>
          <Text style={styles.example}>{item.example}</Text>
          <Text style={styles.exampleVi}>{item.example_vi}</Text>
        </View>
        {speechAvailable && (
          <SpeakerButton
            onPress={() => onSpeakExample(item.example)}
            accessibilityLabel={`Nghe câu ví dụ: ${item.example}`}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SnapVocabColors.card,
    borderRadius: 22,
    padding: 18,
    gap: 12,
    boxShadow: SnapVocabShadows.card,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    experimental_backgroundImage: SnapVocabGradients.button,
    backgroundColor: SnapVocabColors.primary,
  },
  indexLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: SnapVocabColors.onPrimary,
  },
  wordColumn: {
    flex: 1,
    gap: 2,
  },
  word: {
    fontSize: 23,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: SnapVocabColors.text,
  },
  reading: {
    fontSize: 14,
    color: SnapVocabColors.primary,
  },
  readingProminent: {
    fontSize: 18,
    fontWeight: '600',
    color: SnapVocabColors.primary,
  },
  vietnamese: {
    fontSize: 17,
    fontWeight: '600',
    color: SnapVocabColors.text,
  },
  /**
   * The example sits in its own tinted block instead of under a plain divider:
   * it is the one part of the card the learner reads as a sentence rather than
   * as a field, so it gets a shape of its own.
   */
  exampleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SnapVocabColors.background,
    borderRadius: 16,
    borderLeftWidth: 3,
    borderLeftColor: SnapVocabColors.accent,
    paddingVertical: 12,
    paddingLeft: 13,
    paddingRight: 8,
  },
  exampleColumn: {
    flex: 1,
    gap: 5,
  },
  example: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    color: SnapVocabColors.text,
  },
  exampleVi: {
    fontSize: 14,
    lineHeight: 20,
    color: SnapVocabColors.textSecondary,
  },
  speakerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: SnapVocabColors.primarySoft,
  },
  speakerButtonPressed: {
    backgroundColor: SnapVocabColors.border,
  },
});
