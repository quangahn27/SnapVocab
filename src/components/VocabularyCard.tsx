import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { SnapVocabColors } from '@/constants/colors';
import type { TargetLanguage } from '@/constants/languages';
import type { VocabularyItem } from '@/types/vocabulary';

type VocabularyCardProps = {
  item: VocabularyItem;
  language: TargetLanguage;
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
      <Icon name="volume-up" size={22} color={SnapVocabColors.primary} />
    </Pressable>
  );
}

export function VocabularyCard({
  item,
  language,
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

      <View style={styles.divider} />

      <View style={styles.exampleRow}>
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SnapVocabColors.border,
    padding: 18,
    gap: 4,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordColumn: {
    flex: 1,
    gap: 4,
  },
  word: {
    fontSize: 22,
    fontWeight: '700',
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
    fontSize: 16,
    fontWeight: '600',
    color: SnapVocabColors.text,
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: SnapVocabColors.border,
    marginVertical: 14,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  exampleColumn: {
    flex: 1,
    gap: 6,
  },
  example: {
    fontSize: 15,
    fontWeight: '500',
    color: SnapVocabColors.text,
  },
  exampleVi: {
    fontSize: 14,
    color: SnapVocabColors.textSecondary,
  },
  speakerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  speakerButtonPressed: {
    backgroundColor: SnapVocabColors.background,
  },
});
