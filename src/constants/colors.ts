/**
 * Fixed light palette for the SnapVocab screen.
 * SnapVocab does not support dark mode, so there is deliberately no
 * light/dark theme layer — these values are the whole palette.
 */
export const SnapVocabColors = {
  background: '#F7F8FC',
  card: '#FFFFFF',
  primary: '#5B5FEF',
  /** Tint for icon circles, empty slots and the "listen to everything" card. */
  primarySoft: '#EEEFFE',
  /** Border that reads as indigo rather than grey on a `primarySoft` fill. */
  primaryBorder: '#D7D9FB',
  accent: '#18B892',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  error: '#DC2626',
  errorSoft: '#FEF2F2',
  /** Text and icons that sit on the gradient or on a filled button. */
  onPrimary: '#FFFFFF',
  /** Chip and pill fills for content laid over the gradient. */
  onPrimarySoft: 'rgba(255, 255, 255, 0.18)',
  onPrimaryMuted: 'rgba(255, 255, 255, 0.78)',
} as const;

/**
 * CSS gradients, via React Native's own `experimental_backgroundImage` — no
 * native gradient library, so nothing here needs a rebuild.
 */
export const SnapVocabGradients = {
  /**
   * Vertical on purpose: a vertical gradient's top edge is one flat colour at
   * any screen width, so the strip painted behind the status bar
   * (`SnapVocabColors.primary`) lines up with the header exactly.
   */
  hero: 'linear-gradient(180deg, #5B5FEF 0%, #7B5CF5 58%, #8B5CF6 100%)',
  /** Diagonal: buttons and badges are small, so the shift needs to be quick. */
  button: 'linear-gradient(135deg, #5B5FEF 0%, #8B5CF6 100%)',
} as const;

/**
 * Elevation tokens. `boxShadow` is a core React Native style from 0.76 on and
 * renders on both platforms, so one token covers iOS and Android.
 *
 * A shadow is drawn outside the view's bounds, which `overflow: 'hidden'`
 * clips — so anything that clips its children (an image rounded to a radius)
 * needs the shadow on a wrapper instead of on the clipping view itself.
 */
export const SnapVocabShadows = {
  card: [{ offsetX: 0, offsetY: 6, blurRadius: 20, color: 'rgba(17, 24, 39, 0.06)' }],
  cardRaised: [{ offsetX: 0, offsetY: 12, blurRadius: 28, color: 'rgba(17, 24, 39, 0.10)' }],
  /** Tinted with the button's own colour so it reads as glow, not grime. */
  button: [{ offsetX: 0, offsetY: 10, blurRadius: 22, color: 'rgba(91, 95, 239, 0.30)' }],
} as const;
