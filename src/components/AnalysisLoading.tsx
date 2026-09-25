import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { SnapVocabColors } from '@/constants/colors';

const HINTS = [
  'Đang quan sát bức ảnh...',
  'Đang tìm những từ hữu ích...',
  'Đang tạo ví dụ cho bạn...',
];

const HINT_INTERVAL_MS = 2200;

export function AnalysisLoading() {
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % HINTS.length);
    }, HINT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.card}>
      <ActivityIndicator size="small" color={SnapVocabColors.primary} />
      <Text style={styles.hint}>{HINTS[hintIndex]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SnapVocabColors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: SnapVocabColors.border,
    padding: 18,
  },
  hint: {
    fontSize: 15,
    fontWeight: '500',
    color: SnapVocabColors.text,
  },
});
