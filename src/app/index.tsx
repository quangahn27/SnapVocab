import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnalysisLoading } from '@/components/AnalysisLoading';
import { ErrorState } from '@/components/ErrorState';
import { ImagePickerCard } from '@/components/ImagePickerCard';
import { ImagePreview } from '@/components/ImagePreview';
import { PrimaryButton } from '@/components/PrimaryButton';
import { VocabularyCard } from '@/components/VocabularyCard';
import { SnapVocabColors } from '@/constants/colors';
import { AnalysisError, analyzeImage } from '@/services/gemini';
import {
  ImagePickError,
  pickImageFromCamera,
  pickImageFromLibrary,
  processImageForAnalysis,
  type PickedAsset,
} from '@/services/image';
import { logError } from '@/services/logger';
import { speakAll, speakEnglish, stopSpeaking } from '@/services/speech';
import type { ImageAnalysisResult } from '@/types/vocabulary';

const GENERIC_ERROR_MESSAGE = 'Không thể phân tích ảnh lúc này. Vui lòng thử lại.';
const CONTENT_MAX_WIDTH = 480;

type SelectedImage = {
  uri: string;
  base64: string;
};

export default function SnapVocabScreen() {
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [result, setResult] = useState<ImageAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  async function handlePick(source: 'camera' | 'library') {
    if (isPicking || isAnalyzing) return;
    setIsPicking(true);
    setError(null);
    try {
      const asset: PickedAsset | null =
        source === 'camera' ? await pickImageFromCamera() : await pickImageFromLibrary();
      if (!asset) return;

      stopSpeaking();
      const processed = await processImageForAnalysis(asset);
      setResult(null);
      setSelectedImage({ uri: processed.uri, base64: processed.base64 });
    } catch (err) {
      setSelectedImage(null);
      setResult(null);
      if (err instanceof ImagePickError) {
        setError(err.message);
      } else {
        logError('screen.imagePick', err);
        setError(GENERIC_ERROR_MESSAGE);
      }
    } finally {
      setIsPicking(false);
    }
  }

  async function handleAnalyze() {
    if (!selectedImage || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const data = await analyzeImage(selectedImage.base64, 'image/jpeg');
      setResult(data);
    } catch (err) {
      if (err instanceof AnalysisError) {
        setError(err.message);
      } else {
        logError('screen.analyze', err);
        setError(GENERIC_ERROR_MESSAGE);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleReset() {
    stopSpeaking();
    setSelectedImage(null);
    setResult(null);
    setError(null);
    setIsAnalyzing(false);
  }

  function handleRetry() {
    setError(null);
    if (selectedImage) {
      handleAnalyze();
    }
  }

  const screenState: 'EMPTY' | 'PREVIEW' | 'ANALYZING' | 'RESULT' | 'ERROR' = error
    ? 'ERROR'
    : isAnalyzing
      ? 'ANALYZING'
      : result
        ? 'RESULT'
        : selectedImage
          ? 'PREVIEW'
          : 'EMPTY';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollOuter} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {screenState === 'RESULT' && result ? (
            <View style={styles.resultHeaderRow}>
              <Pressable
                onPress={handleReset}
                accessibilityRole="button"
                accessibilityLabel="Quay lại"
                hitSlop={8}
                style={styles.backButton}>
                <Text style={styles.backArrow}>←</Text>
              </Pressable>
              <View style={styles.resultHeaderTextColumn}>
                <Text style={styles.resultLabel}>KẾT QUẢ</Text>
                <Text style={styles.headline}>Từ vựng trong ảnh</Text>
              </View>
            </View>
          ) : (
            <View style={styles.header}>
              <Text style={styles.appTitle}>SnapVocab</Text>
              {screenState === 'EMPTY' && (
                <Text style={styles.appSubtitle}>Học tiếng Anh từ thế giới xung quanh bạn.</Text>
              )}
            </View>
          )}

          {screenState === 'EMPTY' && (
            <View style={styles.section}>
              <Text style={styles.headline}>Bạn muốn học gì hôm nay?</Text>
              <Text style={styles.description}>
                Chụp một bức ảnh hoặc chọn ảnh có sẵn. SnapVocab sẽ tìm những từ tiếng Anh hữu ích
                trong ảnh.
              </Text>
              <ImagePickerCard
                onPickCamera={() => handlePick('camera')}
                onPickLibrary={() => handlePick('library')}
                disabled={isPicking}
              />
            </View>
          )}

          {(screenState === 'PREVIEW' || screenState === 'ANALYZING') && selectedImage && (
            <View style={styles.section}>
              <ImagePreview
                uri={selectedImage.uri}
                onChangeImage={() => handlePick('library')}
                disabled={isAnalyzing || isPicking}
              />
              <Text style={styles.headline}>Sẵn sàng khám phá?</Text>
              <Text style={styles.description}>
                AI sẽ tìm tối đa 5 từ tiếng Anh hữu ích trong bức ảnh này.
              </Text>
              {screenState === 'ANALYZING' ? (
                <AnalysisLoading />
              ) : (
                <>
                  <PrimaryButton label="✨ Phân tích ảnh" onPress={handleAnalyze} disabled={isPicking} />
                  <PrimaryButton
                    label="Chọn ảnh khác"
                    variant="text"
                    onPress={() => handlePick('library')}
                    disabled={isPicking}
                  />
                </>
              )}
            </View>
          )}

          {screenState === 'RESULT' && result && (
            <View style={styles.section}>
              <Text style={styles.foundCount}>{result.items.length} từ được tìm thấy</Text>

              {selectedImage && (
                <Image source={{ uri: selectedImage.uri }} style={styles.resultImage} contentFit="cover" />
              )}

              <View style={styles.summaryCard}>
                <View style={styles.summaryHeaderRow}>
                  <Text style={styles.summaryIcon}>🔊</Text>
                  <Text style={styles.summaryTitle}>Nghe toàn bộ</Text>
                </View>
                <Text style={styles.summaryNarrative}>{result.full_narrative}</Text>
                <PrimaryButton
                  label="▶ Nghe"
                  variant="secondary"
                  onPress={() => speakAll(result.items)}
                />
              </View>

              {result.items.map((item, index) => (
                <VocabularyCard
                  key={`${item.english}-${index}`}
                  item={item}
                  onSpeakWord={speakEnglish}
                  onSpeakExample={speakEnglish}
                />
              ))}

              <PrimaryButton label="Phân tích ảnh khác" onPress={handleReset} />
            </View>
          )}

          {screenState === 'ERROR' && (
            <View style={styles.section}>
              <ErrorState message={error ?? GENERIC_ERROR_MESSAGE} onRetry={handleRetry} />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SnapVocabColors.background,
  },
  scrollOuter: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 32,
  },
  content: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    paddingHorizontal: 20,
    gap: 24,
  },
  header: {
    paddingTop: 24,
    gap: 8,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: SnapVocabColors.text,
  },
  appSubtitle: {
    fontSize: 16,
    color: SnapVocabColors.textSecondary,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -12,
  },
  backArrow: {
    fontSize: 22,
    color: SnapVocabColors.text,
  },
  resultHeaderTextColumn: {
    gap: 2,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: SnapVocabColors.textSecondary,
  },
  section: {
    gap: 16,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: SnapVocabColors.text,
  },
  description: {
    fontSize: 15,
    color: SnapVocabColors.textSecondary,
    lineHeight: 22,
  },
  foundCount: {
    fontSize: 15,
    color: SnapVocabColors.textSecondary,
  },
  resultImage: {
    width: '100%',
    aspectRatio: 1.6,
    borderRadius: 20,
  },
  summaryCard: {
    backgroundColor: SnapVocabColors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SnapVocabColors.border,
    padding: 18,
    gap: 12,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryIcon: {
    fontSize: 18,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SnapVocabColors.text,
  },
  summaryNarrative: {
    fontSize: 15,
    color: SnapVocabColors.text,
    lineHeight: 22,
  },
});
