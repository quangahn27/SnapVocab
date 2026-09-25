import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { SnapVocabColors } from '@/constants/colors';

type Variant = 'primary' | 'secondary' | 'text';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityLabel,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'text' && styles.text,
        pressed && !isDisabled && variant === 'primary' && styles.primaryPressed,
        pressed && !isDisabled && variant !== 'primary' && styles.otherPressed,
        isDisabled && styles.disabled,
      ]}>
      <View style={styles.content}>
        {loading && (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? '#FFFFFF' : SnapVocabColors.primary}
          />
        )}
        <Text
          style={[
            styles.label,
            variant === 'primary' && styles.labelPrimary,
            variant === 'secondary' && styles.labelSecondary,
            variant === 'text' && styles.labelText,
          ]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primary: {
    backgroundColor: SnapVocabColors.primary,
  },
  primaryPressed: {
    backgroundColor: SnapVocabColors.primaryPressed,
  },
  secondary: {
    backgroundColor: SnapVocabColors.card,
    borderWidth: 1,
    borderColor: SnapVocabColors.border,
  },
  otherPressed: {
    opacity: 0.7,
  },
  text: {
    backgroundColor: 'transparent',
    minHeight: 44,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  labelPrimary: {
    color: '#FFFFFF',
  },
  labelSecondary: {
    color: SnapVocabColors.text,
  },
  labelText: {
    color: SnapVocabColors.primary,
  },
});
