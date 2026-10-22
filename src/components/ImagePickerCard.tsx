import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SnapVocabColors } from '@/constants/colors';

type ImagePickerCardProps = {
  onPickCamera: () => void;
  onPickLibrary: () => void;
  disabled?: boolean;
};

export function ImagePickerCard({ onPickCamera, onPickLibrary, disabled }: ImagePickerCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Icon
          name="add-photo-alternate"
          size={44}
          color={SnapVocabColors.textSecondary}
          style={styles.placeholderIcon}
        />
        <Text style={styles.placeholderTitle}>Thêm một bức ảnh</Text>
        <Text style={styles.placeholderSubtitle}>JPG, PNG hoặc ảnh từ camera</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Chụp ảnh"
          icon="photo-camera"
          variant="primary"
          onPress={onPickCamera}
          disabled={disabled}
        />
        <PrimaryButton
          label="Chọn từ thư viện"
          icon="photo-library"
          variant="secondary"
          onPress={onPickLibrary}
          disabled={disabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  placeholder: {
    width: '100%',
    aspectRatio: 1.3,
    borderRadius: 24,
    backgroundColor: SnapVocabColors.card,
    borderWidth: 1.5,
    borderColor: SnapVocabColors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 24,
  },
  placeholderIcon: {
    marginBottom: 4,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SnapVocabColors.text,
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: SnapVocabColors.textSecondary,
  },
  actions: {
    gap: 12,
  },
});
