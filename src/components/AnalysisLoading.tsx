import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { SnapVocabColors, SnapVocabShadows } from '@/constants/colors';

const HINTS = [
  'Đang quan sát bức ảnh...',
  'Đang tìm những từ hữu ích...',
  'Đang tạo ví dụ cho bạn...',
];

const HINT_INTERVAL_MS = 2200;
const DOT_DURATION_MS = 620;

/** One dot of the three-dot pulse; `delay` is what staggers them into a wave. */
function PulsingDot({ delay }: { delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(
        delay,
        // -1 repeats forever, `true` reverses each pass, so the dot breathes
        // instead of snapping back to the start.
        withRepeat(withTiming(1, { duration: DOT_DURATION_MS, easing: Easing.inOut(Easing.quad) }), -1, true),
      ),
    );
    return () => cancelAnimation(progress);
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.3 + progress.get() * 0.7,
    transform: [{ scale: 0.7 + progress.get() * 0.3 }],
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

export function AnalysisLoading() {
  const [hintIndex, setHintIndex] = useState(0);
  const hintOpacity = useSharedValue(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % HINTS.length);
    }, HINT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Fade the line back in whenever the wording changes. Jumping to 0 first and
  // animating up keeps one Text mounted, so there is no unmount flicker.
  useEffect(() => {
    hintOpacity.set(0);
    hintOpacity.set(withTiming(1, { duration: 320 }));
  }, [hintIndex, hintOpacity]);

  const hintStyle = useAnimatedStyle(() => ({ opacity: hintOpacity.get() }));

  return (
    <View style={styles.card}>
      <View style={styles.dots}>
        <PulsingDot delay={0} />
        <PulsingDot delay={160} />
        <PulsingDot delay={320} />
      </View>
      <Animated.Text style={[styles.hint, hintStyle]}>{HINTS[hintIndex]}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: SnapVocabColors.card,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 20,
    boxShadow: SnapVocabShadows.card,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: SnapVocabColors.primary,
  },
  hint: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: SnapVocabColors.text,
  },
});
