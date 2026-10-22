import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/Icon';
import { SnapVocabColors, SnapVocabGradients, SnapVocabShadows } from '@/constants/colors';

type Variant = 'primary' | 'secondary' | 'text';

/** Label, icon and spinner always share one colour per variant. */
const CONTENT_COLOR: Record<Variant, string> = {
  primary: SnapVocabColors.onPrimary,
  secondary: SnapVocabColors.text,
  text: SnapVocabColors.primary,
};

/** Quick and barely-there: a press should feel answered, not animated. */
const PRESS_SPRING = { damping: 18, stiffness: 320 } as const;
const PRESSED_SCALE = 0.97;

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

  // `.get()`/`.set()` rather than `.value`, because this project builds with
  // the React Compiler (app.json → experiments.reactCompiler).
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => scale.set(withSpring(PRESSED_SCALE, PRESS_SPRING))}
        onPressOut={() => scale.set(withSpring(1, PRESS_SPRING))}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: isDisabled }}
        style={({ pressed }) => [
          styles.base,
          variant === 'primary' && styles.primary,
          variant === 'secondary' && styles.secondary,
          variant === 'text' && styles.text,
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  primary: {
    // The gradient replaces the flat fill, so there is no separate pressed
    // colour: the scale spring is what answers the press.
    experimental_backgroundImage: SnapVocabGradients.button,
    backgroundColor: SnapVocabColors.primary,
    boxShadow: SnapVocabShadows.button,
  },
  secondary: {
    backgroundColor: SnapVocabColors.card,
    borderWidth: 1,
    borderColor: SnapVocabColors.border,
    boxShadow: SnapVocabShadows.card,
  },
  otherPressed: {
    opacity: 0.7,
  },
  text: {
    backgroundColor: 'transparent',
    minHeight: 44,
    paddingVertical: 10,
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
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
