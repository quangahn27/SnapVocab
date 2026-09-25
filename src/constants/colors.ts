/**
 * Fixed light palette for the SnapVocab MVP screen.
 * This is intentionally separate from the app's system light/dark ThemeColor
 * (see `theme.ts`), since SnapVocab does not support dark mode yet.
 */
export const SnapVocabColors = {
  background: '#F7F8FC',
  card: '#FFFFFF',
  primary: '#5B5FEF',
  primaryPressed: '#4B4FD8',
  accent: '#18B892',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  error: '#DC2626',
} as const;
