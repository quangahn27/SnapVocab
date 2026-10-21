import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnalysisLoading } from '@/components/AnalysisLoading';
import { ErrorState } from '@/components/ErrorState';
import { ImagePickerCard } from '@/components/ImagePickerCard';
import { ImagePreview } from '@/components/ImagePreview';
import { LanguagePicker } from '@/components/LanguagePicker';
import { PrimaryButton } from '@/components/PrimaryButton';
import { VocabularyCard } from '@/components/VocabularyCard';
import { SnapVocabColors } from '@/constants/colors';
import { getTargetLanguage, type TargetLanguageCode } from '@/constants/languages';
import { AnalysisError, analyzeImage } from '@/services/gemini';
import {
  ImagePickError,
  pickImageFromCamera,
  pickImageFromLibrary,
  processImageForAnalysis,
  type PickedAsset,
} from '@/services/image';
import { logError } from '@/services/logger';
import { getPreferredLanguage, setPreferredLanguage } from '@/services/preferences';
import { isLanguageSupported, speakAll, speakText, stopSpeaking } from '@/services/speech';
import type { ImageAnalysisResult } from '@/types/vocabulary';

const GENERIC_ERROR_MESSAGE = 'Không thể phân tích ảnh lúc này. Vui lòng thử lại.';
const CONTENT_MAX_WIDTH = 480;

type SelectedImage = {
  uri: string;
  base64: string;
};

type ScreenError = {
  message: string;
  retryAfterSeconds?: number;
};

export default function SnapVocabScreen() {
  const [language, setLanguage] = useState<TargetLanguageCode>(() => getPreferredLanguage());
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [result, setResult] = useState<ImageAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [error, setError] = useState<ScreenError | null>(null);
  const [speechAvailable, setSpeechAvailable] = useState(true);

  const targetLanguage = getTargetLanguage(language);
  // "Tiếng Nhật" -> "tiếng Nhật", so it reads naturally mid-sentence.
  const languageName = targetLanguage.label.charAt(0).toLowerCase() + targetLanguage.label.slice(1);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // A device may simply not have a voice for the target language installed,
  // in which case the speaker buttons are hidden rather than playing silence.
  useEffect(() => {
    let active = true;
    isLanguageSupported(targetLanguage.speechLanguage).then((supported) => {
      if (active) setSpeechAvailable(supported);
    });
    return () => {
      active = false;
    };
  }, [targetLanguage.speechLanguage]);

  function handleChangeLanguage(code: TargetLanguageCode) {
    if (code === language) return;
    stopSpeaking();
    setLanguage(code);
    setPreferredLanguage(code);
    setResult(null);
    setError(null);
  }

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
        setError({ message: err.message });
      } else {
        logError('screen.imagePick', err);
        setError({ message: GENERIC_ERROR_MESSAGE });
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
      const data = await analyzeImage(selectedImage.base64, language);
      setResult(data);
    } catch (err) {
      if (err instanceof AnalysisError) {
        setError({ message: err.message, retryAfterSeconds: err.retryAfterSeconds });
      } else {
        logError('screen.analyze', err);
        setError({ message: GENERIC_ERROR_MESSAGE });
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

  const resultLanguage = result ? getTargetLanguage(result.language) : targetLanguage;

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
                <Text style={styles.appSubtitle}>
                  Học {languageName} từ thế giới xung quanh bạn.
                </Text>
              )}
            </View>
          )}

          {(screenState === 'EMPTY' || screenState === 'PREVIEW') && (
            <View style={styles.section}>
              <LanguagePicker
                value={language}
                onChange={handleChangeLanguage}
                disabled={isPicking || isAnalyzing}
              />
              {!speechAvailable && (
                <Text style={styles.speechWarning}>
                  ⚠️ Thiết bị chưa cài giọng đọc {languageName}. Bạn vẫn xem được từ vựng, nhưng nút
                  nghe sẽ bị ẩn. Có thể cài thêm giọng trong phần Cài đặt của máy.
                </Text>
              )}
            </View>
          )}

          {screenState === 'EMPTY' && (
            <View style={styles.section}>
              <Text style={styles.headline}>Bạn muốn học gì hôm nay?</Text>
              <Text style={styles.description}>
                Chụp một bức ảnh hoặc chọn ảnh có sẵn. SnapVocab sẽ tìm những từ {languageName} hữu
                ích trong ảnh.
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
                AI sẽ tìm tối đa 5 từ {languageName} hữu ích trong bức ảnh này.
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
              <Text style={styles.foundCount}>
                {result.items.length} từ {languageName} được tìm thấy
                {typeof result.quotaRemaining === 'number'
                  ? ` · còn ${result.quotaRemaining} lượt hôm nay`
                  : ''}
              </Text>

              {selectedImage && (
                <Image source={{ uri: selectedImage.uri }} style={styles.resultImage} contentFit="cover" />
              )}

              <View style={styles.summaryCard}>
                <View style={styles.summaryHeaderRow}>
                  <Text style={styles.summaryIcon}>🔊</Text>
                  <Text style={styles.summaryTitle}>Nghe toàn bộ</Text>
                </View>
                <Text style={styles.summaryNarrative}>{result.full_narrative}</Text>
                {speechAvailable && (
                  <PrimaryButton
                    label="▶ Nghe"
                    variant="secondary"
                    onPress={() => speakAll(result.items, resultLanguage.speechLanguage)}
                  />
                )}
              </View>

              {result.items.map((item, index) => (
                <VocabularyCard
                  key={`${item.word}-${index}`}
                  item={item}
                  language={resultLanguage}
                  speechAvailable={speechAvailable}
                  onSpeakWord={(text) => speakText(text, resultLanguage.speechLanguage)}
                  onSpeakExample={(text) => speakText(text, resultLanguage.speechLanguage)}
                />
              ))}

              <PrimaryButton label="Phân tích ảnh khác" onPress={handleReset} />
            </View>
          )}

          {screenState === 'ERROR' && (
            <View style={styles.section}>
              <ErrorState
                message={error?.message ?? GENERIC_ERROR_MESSAGE}
                retryAfterSeconds={error?.retryAfterSeconds}
                onRetry={handleRetry}
              />
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
  speechWarning: {
    fontSize: 13,
    color: SnapVocabColors.textSecondary,
    lineHeight: 20,
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
