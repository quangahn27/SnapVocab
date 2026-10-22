import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SnapVocabColors, SnapVocabShadows } from '@/constants/colors';

type ImagePickerCardProps = {
  onPickCamera: () => void;
  onPickLibrary: () => void;
  disabled?: boolean;
};

export function ImagePickerCard({ onPickCamera, onPickLibrary, disabled }: ImagePickerCardProps) {
  return (
    <View style={styles.container}>
      {/* An empty slot, so it is tinted and dashed rather than raised like a
          card that already holds something. */}
      <View style={styles.placeholder}>
        <View style={styles.iconCircle}>
          <Icon name="add-photo-alternate" size={36} color={SnapVocabColors.primary} />
        </View>
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
    gap: 14,
  },
  placeholder: {
    width: '100%',
    aspectRatio: 1.35,
    borderRadius: 26,
    backgroundColor: SnapVocabColors.primarySoft,
    borderWidth: 1.5,
    borderColor: SnapVocabColors.primaryBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SnapVocabColors.card,
    boxShadow: SnapVocabShadows.card,
    marginBottom: 10,
  },
  placeholderTitle: {
    fontSize: 17,
    fontWeight: '700',
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
