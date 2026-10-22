/**
 * Every icon in the app comes from this one Material Icons set, so weights and
 * stroke widths stay consistent — and swapping icon sets later is an edit to
 * this file instead of a sweep through the screens. Material Icons is the
 * smallest set that covers what SnapVocab needs (348KB vs 1.3MB for the
 * Material Design Icons community set) — worth it for ~10 glyphs.
 *
 * The root (dynamic) import is deliberate: the .ttf ships as a JS asset and
 * `expo-font` registers it the first time an icon renders, so icons work in
 * Expo Go and in already-installed native builds, with no prebuild. The
 * package's config plugin, which `npx expo install` adds to app.json on its
 * own, is deliberately *not* kept there: it only serves the `/static` import,
 * and this project ships committed native folders without running prebuild,
 * so the entry would never be applied.
 */
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import type { ComponentProps } from 'react';

export const Icon = MaterialIcons;

export type IconName = ComponentProps<typeof MaterialIcons>['name'];
