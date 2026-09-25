export type VocabularyItem = {
  english: string;
  phonetic: string;
  vietnamese: string;
  example_en: string;
  example_vi: string;
};

export type ImageAnalysisResult = {
  full_narrative: string;
  items: VocabularyItem[];
};
