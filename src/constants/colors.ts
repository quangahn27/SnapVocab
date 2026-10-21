/**
 * Fixed light palette for the SnapVocab screen.
 * SnapVocab does not support dark mode, so there is deliberately no
 * light/dark theme layer — these values are the whole palette.
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
