import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SnapVocabColors } from '@/constants/colors';

type ImagePreviewProps = {
  uri: string;
  onChangeImage: () => void;
  disabled?: boolean;
};

export function ImagePreview({ uri, onChangeImage, disabled }: ImagePreviewProps) {
  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={styles.image} contentFit="cover" />
      <Pressable
        onPress={onChangeImage}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Đổi ảnh"
        style={({ pressed }) => [styles.changeButton, pressed && !disabled && styles.changeButtonPressed]}>
        <Text style={styles.changeButtonLabel}>Đổi ảnh</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1.3,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: SnapVocabColors.card,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  changeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
  },
  changeButtonPressed: {
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
  },
  changeButtonLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
