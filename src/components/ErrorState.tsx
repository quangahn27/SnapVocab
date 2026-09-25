import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { SnapVocabColors } from '@/constants/colors';

type ErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.message}>{message}</Text>
      <PrimaryButton label="Thử lại" onPress={onRetry} variant="primary" />
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
});
