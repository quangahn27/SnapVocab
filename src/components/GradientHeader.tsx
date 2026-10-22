import { StyleSheet, View, type ViewProps } from 'react-native';

import { SnapVocabColors, SnapVocabGradients } from '@/constants/colors';

/**
 * The gradient surface at the top of the screen. It is a plain container on
 * purpose — every screen state puts different content inside it (title and
 * language picker while picking, a back button and the result label after),
 * so composing beats a prop for each variant.
 *
 * It scrolls away with the content; the strip behind the status bar is painted
 * separately in the screen so the top of the window stays gradient-coloured.
 */
export function GradientHeader({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.header, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    experimental_backgroundImage: SnapVocabGradients.hero,
    // Only the bottom corners are rounded: the top edge butts against the
    // status-bar strip and has to stay square to look like one surface.
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 18,
    // Lifts the gradient over the first card so the two never look welded.
    boxShadow: [{ offsetX: 0, offsetY: 8, blurRadius: 24, color: 'rgba(91, 95, 239, 0.28)' }],
    backgroundColor: SnapVocabColors.primary,
  },
});
