This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Project overview

**SnapVocab** — take or pick a photo, and Gemini identifies 3–5 useful English vocabulary words for the objects visible in it (IPA, Vietnamese translation, example sentence pair, and a Vietnamese narration), for Vietnamese learners of English. Everything runs client-side; there is **no backend/server**.

- `src/app/index.tsx` — the single main screen. Drives one local state machine: `EMPTY → PREVIEW → ANALYZING → RESULT`, with `ERROR` reachable from any step.
- `src/services/image.ts` — camera/library picking (`expo-image-picker`) and resize/compress-to-base64 (`expo-image-manipulator`, max edge 1280px, JPEG q0.75) before sending to Gemini.
- `src/services/gemini.ts` — calls the Gemini REST API (`generativelanguage.googleapis.com`) directly from the app using `EXPO_PUBLIC_GEMINI_API_KEY` + `EXPO_PUBLIC_GEMINI_MODEL` (see `.env.example`). Response is validated with `zod`. **Known accepted tradeoff:** `EXPO_PUBLIC_*` vars are bundled into the client and extractable from a production build — fine for this MVP/prototype stage only; a real release needs a backend proxy so the key isn't shipped to devices.
- `src/services/speech.ts` — wraps `expo-speech` to play word → meaning → example → translation sequences (single item or "Nghe toàn bộ" for all items), with a generation counter so a new playback request cancels an in-flight one instead of overlapping audio.
- `src/constants/analysisPrompt.ts` — the Gemini prompt and the `responseSchema` (Gemini's schema dialect is a JSON Schema subset without `additionalProperties`, so item shape is re-validated locally via zod in `gemini.ts`).
- `src/types/vocabulary.ts` — shared `VocabularyItem` / `ImageAnalysisResult` types.
- Error handling: `AnalysisError` (gemini.ts) and `ImagePickError` (image.ts) carry a code + a user-facing Vietnamese message rendered by `ErrorState`. All caught failures go through `src/services/logger.ts` (`logError`), which both `console.error`s and appends a JSON line (`{time, scope, message, ...meta}`) to a local file (`documentDirectory/snapvocab-error-log.txt`, capped at 256KB) via `expo-file-system`'s new `File`/`Paths` API — so errors survive past the current app/Metro session. `readErrorLog()`/`clearErrorLog()` are there for a future debug screen; nothing reads the log yet.
- Bundle/package id: `com.quangahn.x27.SnapVocab` (both iOS and Android, see `app.json`).

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
