import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { SnapVocabColors, SnapVocabShadows } from '@/constants/colors';

type ImagePreviewProps = {
  uri: string;
  onChangeImage: () => void;
  disabled?: boolean;
};

export function ImagePreview({ uri, onChangeImage, disabled }: ImagePreviewProps) {
  return (
    // The shadow lives on the outer view and the rounding on the inner one:
    // `overflow: 'hidden'` is what clips the photo to the radius, and it would
    // clip the shadow away too if both sat on the same view.
    <View style={styles.shadow}>
      <View style={styles.container}>
        <Image source={{ uri }} style={styles.image} contentFit="cover" />
        <Pressable
          onPress={onChangeImage}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Đổi ảnh"
          style={({ pressed }) => [styles.changeButton, pressed && !disabled && styles.changeButtonPressed]}>
          <Icon name="swap-horiz" size={18} color={SnapVocabColors.onPrimary} />
          <Text style={styles.changeButtonLabel}>Đổi ảnh</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 26,
    boxShadow: SnapVocabShadows.cardRaised,
  },
  container: {
    width: '100%',
    aspectRatio: 1.35,
    borderRadius: 26,
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
    minHeight: 38,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(17, 24, 39, 0.62)',
  },
  changeButtonPressed: {
    backgroundColor: 'rgba(17, 24, 39, 0.82)',
  },
  changeButtonLabel: {
    color: SnapVocabColors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
