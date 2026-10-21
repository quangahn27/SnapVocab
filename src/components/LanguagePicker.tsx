import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SnapVocabColors } from '@/constants/colors';
import { TARGET_LANGUAGES, type TargetLanguageCode } from '@/constants/languages';

type LanguagePickerProps = {
  value: TargetLanguageCode;
  onChange: (code: TargetLanguageCode) => void;
  disabled?: boolean;
};

export function LanguagePicker({ value, onChange, disabled = false }: LanguagePickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Bạn muốn học ngôn ngữ nào?</Text>
      <View style={styles.row}>
        {TARGET_LANGUAGES.map((language) => {
          const selected = language.code === value;
          return (
            <Pressable
              key={language.code}
              onPress={() => onChange(language.code)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={`Học ${language.label}`}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && !disabled && !selected && styles.chipPressed,
                disabled && styles.chipDisabled,
              ]}>
              <Text style={styles.flag}>{language.flag}</Text>
              <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                {language.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: SnapVocabColors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: SnapVocabColors.border,
    backgroundColor: SnapVocabColors.card,
  },
  chipSelected: {
    backgroundColor: SnapVocabColors.primary,
    borderColor: SnapVocabColors.primary,
  },
  chipPressed: {
    backgroundColor: SnapVocabColors.background,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  flag: {
    fontSize: 16,
  },
  chipLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: SnapVocabColors.text,
  },
  chipLabelSelected: {
    color: '#FFFFFF',
  },
});
