import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { SnapVocabColors } from '@/constants/colors';

type Variant = 'primary' | 'secondary' | 'text';

/** Label, icon and spinner always share one colour per variant. */
const CONTENT_COLOR: Record<Variant, string> = {
  primary: '#FFFFFF',
  secondary: SnapVocabColors.text,
  text: SnapVocabColors.primary,
};

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  /** Leading icon; omitted for buttons whose label already stands alone. */
  icon?: IconName;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
};

export function PrimaryButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityLabel,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const contentColor = CONTENT_COLOR[variant];

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
        {loading ? (
          <ActivityIndicator size="small" color={contentColor} />
        ) : (
          icon && <Icon name={icon} size={20} color={contentColor} />
        )}
        <Text style={[styles.label, { color: contentColor }]}>{label}</Text>
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
});
