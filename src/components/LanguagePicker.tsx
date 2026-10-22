import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SnapVocabColors } from '@/constants/colors';
import { TARGET_LANGUAGES, type TargetLanguageCode } from '@/constants/languages';

type LanguagePickerProps = {
  value: TargetLanguageCode;
  onChange: (code: TargetLanguageCode) => void;
  disabled?: boolean;
};

/**
 * Styled for the gradient header it lives in — white-on-gradient chips, and
 * the selected one inverts to a solid white chip. It is never rendered on the
 * light background, so there is no second colour scheme to carry.
 */
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
              <View style={[styles.badge, selected && styles.badgeSelected]}>
                <Text style={[styles.badgeLabel, selected && styles.badgeLabelSelected]}>
                  {language.script}
                </Text>
              </View>
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
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: SnapVocabColors.onPrimaryMuted,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 44,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: 22,
    backgroundColor: SnapVocabColors.onPrimarySoft,
  },
  chipSelected: {
    backgroundColor: SnapVocabColors.card,
    boxShadow: [{ offsetX: 0, offsetY: 4, blurRadius: 12, color: 'rgba(17, 24, 39, 0.18)' }],
  },
  chipPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
  },
  chipDisabled: {
    opacity: 0.5,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  badgeSelected: {
    backgroundColor: SnapVocabColors.primarySoft,
  },
  badgeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: SnapVocabColors.onPrimary,
  },
  badgeLabelSelected: {
    color: SnapVocabColors.primary,
  },
  chipLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: SnapVocabColors.onPrimary,
  },
  chipLabelSelected: {
    color: SnapVocabColors.primary,
  },
});
