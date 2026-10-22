import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnalysisLoading } from '@/components/AnalysisLoading';
import { ErrorState } from '@/components/ErrorState';
import { GradientHeader } from '@/components/GradientHeader';
import { Icon } from '@/components/Icon';
import { ImagePickerCard } from '@/components/ImagePickerCard';
import { ImagePreview } from '@/components/ImagePreview';
import { LanguagePicker } from '@/components/LanguagePicker';
import { PrimaryButton } from '@/components/PrimaryButton';
import { VocabularyCard } from '@/components/VocabularyCard';
import { SnapVocabColors, SnapVocabShadows } from '@/constants/colors';
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

// The result cards fade in one after another rather than all at once, so the
// list reads as something being handed over instead of a block appearing.
const STAGGER_START_MS = 160;
const STAGGER_STEP_MS = 70;

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
  const insets = useSafeAreaInsets();

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
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* The header scrolls away with the content, so the inset above it is
          painted separately — otherwise the status bar would sit on white
          while its own text is still light. */}
      <View style={[styles.statusStrip, { height: insets.top }]} />

      <ScrollView
        contentContainerStyle={[styles.scrollOuter, { paddingBottom: insets.bottom + 36 }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <GradientHeader>
            {screenState === 'RESULT' && result ? (
              <>
                <View style={styles.resultHeaderRow}>
                  <Pressable
                    onPress={handleReset}
                    accessibilityRole="button"
                    accessibilityLabel="Quay lại"
                    hitSlop={8}
                    style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
                    <Icon name="arrow-back" size={22} color={SnapVocabColors.onPrimary} />
                  </Pressable>
                  <View style={styles.resultHeaderTextColumn}>
                    <Text style={styles.resultLabel}>KẾT QUẢ</Text>
                    <Text style={styles.headlineOnHero}>Từ vựng trong ảnh</Text>
                  </View>
                </View>
                <View style={styles.countPill}>
                  <Icon name="auto-awesome" size={15} color={SnapVocabColors.onPrimary} />
                  <Text style={styles.countPillLabel}>
                    {result.items.length} từ {languageName}
                    {typeof result.quotaRemaining === 'number'
                      ? ` · còn ${result.quotaRemaining} lượt hôm nay`
                      : ''}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.titleBlock}>
                  <Text style={styles.appTitle}>SnapVocab</Text>
                  {screenState === 'EMPTY' && (
                    <Text style={styles.appSubtitle}>
                      Học {languageName} từ thế giới xung quanh bạn.
                    </Text>
                  )}
                </View>
                <LanguagePicker
                  value={language}
                  onChange={handleChangeLanguage}
                  disabled={isPicking || isAnalyzing}
                />
                {!speechAvailable && (
                  <View style={styles.speechWarningRow}>
                    <Icon
                      name="warning-amber"
                      size={16}
                      color={SnapVocabColors.onPrimaryMuted}
                      style={styles.speechWarningIcon}
                    />
                    <Text style={styles.speechWarning}>
                      Thiết bị chưa cài giọng đọc {languageName}. Bạn vẫn xem được từ vựng, nhưng
                      nút nghe sẽ bị ẩn. Có thể cài thêm giọng trong phần Cài đặt của máy.
                    </Text>
                  </View>
                )}
              </>
            )}
          </GradientHeader>

          <View style={styles.body}>
            {screenState === 'EMPTY' && (
              <Animated.View entering={FadeInDown.duration(380)} style={styles.section}>
                <View style={styles.sectionIntro}>
                  <Text style={styles.headline}>Bạn muốn học gì hôm nay?</Text>
                  <Text style={styles.description}>
                    Chụp một bức ảnh hoặc chọn ảnh có sẵn. SnapVocab sẽ tìm những từ {languageName}{' '}
                    hữu ích trong ảnh.
                  </Text>
                </View>
                <ImagePickerCard
                  onPickCamera={() => handlePick('camera')}
                  onPickLibrary={() => handlePick('library')}
                  disabled={isPicking}
                />
              </Animated.View>
            )}

            {(screenState === 'PREVIEW' || screenState === 'ANALYZING') && selectedImage && (
              <Animated.View entering={FadeInDown.duration(380)} style={styles.section}>
                <ImagePreview
                  uri={selectedImage.uri}
                  onChangeImage={() => handlePick('library')}
                  disabled={isAnalyzing || isPicking}
                />
                <View style={styles.sectionIntro}>
                  <Text style={styles.headline}>Sẵn sàng khám phá?</Text>
                  <Text style={styles.description}>
                    AI sẽ tìm tối đa 5 từ {languageName} hữu ích trong bức ảnh này.
                  </Text>
                </View>
                {screenState === 'ANALYZING' ? (
                  <AnalysisLoading />
                ) : (
                  <>
                    <PrimaryButton
                      label="Phân tích ảnh"
                      icon="auto-awesome"
                      onPress={handleAnalyze}
                      disabled={isPicking}
                    />
                    <PrimaryButton
                      label="Chọn ảnh khác"
                      variant="text"
                      onPress={() => handlePick('library')}
                      disabled={isPicking}
                    />
                  </>
                )}
              </Animated.View>
            )}

            {screenState === 'RESULT' && result && (
              <View style={styles.section}>
                {selectedImage && (
                  <Animated.View entering={FadeInDown.duration(380)} style={styles.resultImageShadow}>
                    <Image
                      source={{ uri: selectedImage.uri }}
                      style={styles.resultImage}
                      contentFit="cover"
                    />
                  </Animated.View>
                )}

                <Animated.View
                  entering={FadeInDown.duration(380).delay(80)}
                  style={styles.summaryCard}>
                  <View style={styles.summaryHeaderRow}>
                    <View style={styles.summaryIconCircle}>
                      <Icon name="volume-up" size={18} color={SnapVocabColors.primary} />
                    </View>
                    <Text style={styles.summaryTitle}>Nghe toàn bộ</Text>
                  </View>
                  <Text style={styles.summaryNarrative}>{result.full_narrative}</Text>
                  {speechAvailable && (
                    <PrimaryButton
                      label="Nghe"
                      icon="play-arrow"
                      variant="secondary"
                      onPress={() => speakAll(result.items, resultLanguage.speechLanguage)}
                    />
                  )}
                </Animated.View>

                {result.items.map((item, index) => (
                  <Animated.View
                    key={`${item.word}-${index}`}
                    entering={FadeInDown.duration(380).delay(STAGGER_START_MS + index * STAGGER_STEP_MS)}>
                    <VocabularyCard
                      item={item}
                      index={index + 1}
                      language={resultLanguage}
                      speechAvailable={speechAvailable}
                      onSpeakWord={(text) => speakText(text, resultLanguage.speechLanguage)}
                      onSpeakExample={(text) => speakText(text, resultLanguage.speechLanguage)}
                    />
                  </Animated.View>
                ))}

                <Animated.View
                  entering={FadeInDown.duration(380).delay(
                    STAGGER_START_MS + result.items.length * STAGGER_STEP_MS,
                  )}>
                  <PrimaryButton
                    label="Phân tích ảnh khác"
                    icon="add-a-photo"
                    onPress={handleReset}
                  />
                </Animated.View>
              </View>
            )}

            {screenState === 'ERROR' && (
              <Animated.View entering={FadeInDown.duration(380)} style={styles.section}>
                <ErrorState
                  message={error?.message ?? GENERIC_ERROR_MESSAGE}
                  retryAfterSeconds={error?.retryAfterSeconds}
                  onRetry={handleRetry}
                />
              </Animated.View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SnapVocabColors.background,
  },
  statusStrip: {
    // Matches the first stop of the header gradient, which is vertical for
    // exactly this reason — see SnapVocabGradients.hero.
    backgroundColor: SnapVocabColors.primary,
  },
  scrollOuter: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    gap: 24,
    // No horizontal padding here: the gradient header runs edge to edge, so
    // the inset belongs to the body below it.
  },
  body: {
    paddingHorizontal: 20,
    gap: 24,
  },
  section: {
    gap: 14,
  },
  sectionIntro: {
    gap: 6,
  },
  titleBlock: {
    gap: 6,
  },
  appTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: SnapVocabColors.onPrimary,
  },
  appSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: SnapVocabColors.onPrimaryMuted,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
    backgroundColor: SnapVocabColors.onPrimarySoft,
  },
  backButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
  },
  resultHeaderTextColumn: {
    flex: 1,
    gap: 2,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: SnapVocabColors.onPrimaryMuted,
  },
  headlineOnHero: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: SnapVocabColors.onPrimary,
  },
  countPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: SnapVocabColors.onPrimarySoft,
  },
  countPillLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: SnapVocabColors.onPrimary,
  },
  speechWarningRow: {
    flexDirection: 'row',
    gap: 6,
  },
  speechWarningIcon: {
    // Nudged down to sit on the first line of the text beside it.
    marginTop: 2,
  },
  speechWarning: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: SnapVocabColors.onPrimaryMuted,
  },
  headline: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: SnapVocabColors.text,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: SnapVocabColors.textSecondary,
  },
  resultImageShadow: {
    borderRadius: 22,
    boxShadow: SnapVocabShadows.cardRaised,
  },
  resultImage: {
    width: '100%',
    aspectRatio: 1.6,
    borderRadius: 22,
    backgroundColor: SnapVocabColors.card,
  },
  /** Tinted rather than white, so the narration reads as a summary of the cards below it. */
  summaryCard: {
    backgroundColor: SnapVocabColors.primarySoft,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: SnapVocabColors.primaryBorder,
    padding: 18,
    gap: 12,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SnapVocabColors.card,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SnapVocabColors.text,
  },
  summaryNarrative: {
    fontSize: 15,
    lineHeight: 23,
    color: SnapVocabColors.text,
  },
});
