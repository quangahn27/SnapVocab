import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SnapVocabColors } from '@/constants/colors';
import type { VocabularyItem } from '@/types/vocabulary';

type VocabularyCardProps = {
  item: VocabularyItem;
  onSpeakWord: (text: string) => void;
  onSpeakExample: (text: string) => void;
};

function SpeakerButton({ onPress, accessibilityLabel }: { onPress: () => void; accessibilityLabel: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [styles.speakerButton, pressed && styles.speakerButtonPressed]}>
      <Text style={styles.speakerIcon}>🔊</Text>
    </Pressable>
  );
}

export function VocabularyCard({ item, onSpeakWord, onSpeakExample }: VocabularyCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.wordRow}>
        <View style={styles.wordColumn}>
          <Text style={styles.english}>{item.english}</Text>
          <Text style={styles.phonetic}>{item.phonetic}</Text>
        </View>
        <SpeakerButton
          onPress={() => onSpeakWord(item.english)}
          accessibilityLabel={`Nghe từ ${item.english}`}
        />
      </View>

      <Text style={styles.vietnamese}>{item.vietnamese}</Text>

      <View style={styles.divider} />

      <View style={styles.exampleRow}>
        <View style={styles.exampleColumn}>
          <Text style={styles.exampleEn}>{item.example_en}</Text>
          <Text style={styles.exampleVi}>{item.example_vi}</Text>
        </View>
        <SpeakerButton
          onPress={() => onSpeakExample(item.example_en)}
          accessibilityLabel={`Nghe câu ví dụ: ${item.example_en}`}
        />
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
  english: {
    fontSize: 22,
    fontWeight: '700',
    color: SnapVocabColors.text,
  },
  phonetic: {
    fontSize: 14,
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
  exampleEn: {
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
  speakerIcon: {
    fontSize: 20,
  },
});
