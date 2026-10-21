import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { SnapVocabColors } from '@/constants/colors';

type ErrorStateProps = {
  message: string;
  onRetry: () => void;
  /** When the proxy rate-limits, how long until retrying is worth it. */
  retryAfterSeconds?: number;
};

function formatCountdown(seconds: number): string {
  if (seconds < 60) return `${seconds} giây`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} phút`;
  return `${Math.ceil(minutes / 60)} giờ`;
}

export function ErrorState({ message, onRetry, retryAfterSeconds }: ErrorStateProps) {
  const [remaining, setRemaining] = useState(retryAfterSeconds ?? 0);
  const [countdownFor, setCountdownFor] = useState(retryAfterSeconds);

  // Restart the countdown when a new error arrives, adjusting state during
  // render rather than in an effect (https://react.dev/learn/you-might-not-need-an-effect).
  if (countdownFor !== retryAfterSeconds) {
    setCountdownFor(retryAfterSeconds);
    setRemaining(retryAfterSeconds ?? 0);
  }

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const waiting = remaining > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.message}>{message}</Text>
      {waiting && <Text style={styles.hint}>Có thể thử lại sau {formatCountdown(remaining)}.</Text>}
      <PrimaryButton
        label="Thử lại"
        onPress={onRetry}
        variant="primary"
        disabled={waiting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SnapVocabColors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SnapVocabColors.border,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  icon: {
    fontSize: 32,
  },
  message: {
    fontSize: 15,
    color: SnapVocabColors.error,
    textAlign: 'center',
    lineHeight: 22,
  },
  hint: {
    fontSize: 14,
    color: SnapVocabColors.textSecondary,
    textAlign: 'center',
  },
});
