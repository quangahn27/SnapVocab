This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Project overview

**SnapVocab** — take or pick a photo, and Gemini identifies 3–5 useful vocabulary words for the objects visible in it (the word in its own script, a reading/pronunciation, Vietnamese translation, example sentence pair, and a Vietnamese narration). Built for Vietnamese learners: the **target language is selectable** (English, Japanese, Korean, Chinese) while explanations are always in Vietnamese.

The app talks to **one backend: a Cloudflare Worker proxy** (`worker/snapvocab-proxy.js`), which holds the Gemini key, model and prompt. The app itself ships no secrets.

- `src/app/index.tsx` — the single main screen. Drives one local state machine: `EMPTY → PREVIEW → ANALYZING → RESULT`, with `ERROR` reachable from any step.
- `src/services/image.ts` — camera/library picking (`expo-image-picker`) and resize/compress-to-base64 (`expo-image-manipulator`, max edge 1280px, JPEG q0.75) before sending to Gemini.
- `src/services/gemini.ts` — POSTs the base64 JPEG to the Worker (`EXPO_PUBLIC_API_URL` + `/analyze?lang=<code>`) as a raw `text/plain` body, with a 45s `AbortController` timeout and an `x-device-id` header. Response is validated with `zod`. Failure responses are a `{ error: { code, message, retry_after } }` envelope; known codes map to the app's own Vietnamese copy, unknown codes fall back to the server's text, and non-JSON bodies (Cloudflare error/WAF pages are HTML) fall back to the status code.
- `src/services/speech.ts` — wraps `expo-speech` to play word → meaning → example → translation sequences (single item or "Nghe toàn bộ" for all items), with a generation counter so a new playback request cancels an in-flight one instead of overlapping audio. Each step carries its own BCP-47 tag, so the target language and the Vietnamese explanation are spoken by different voices. **`item.reading` is never spoken** — it is a romanization for the eyes; TTS always gets `item.word` in its own script. `isLanguageSupported()` checks `getAvailableVoicesAsync()` (tolerating Android's ISO-639-2 tags) so the UI can hide speaker buttons when a device has no voice installed.
- `worker/snapvocab-proxy.js` — the Cloudflare Worker: per-language prompt + `responseSchema`, retry on Gemini's transient 5xx, and optional per-device daily quota via a `QUOTA` KV binding. **Deployed by pasting into the Cloudflare dashboard**, and kept in the repo so it is version-controlled with the app. Gemini's schema dialect is a JSON Schema subset without `additionalProperties`, so item shape is re-validated with zod in `gemini.ts`.
- `src/constants/languages.ts` — the target languages: Vietnamese label, BCP-47 speech tag, and `latinScript` (false for ja/ko/zh, which makes `reading` render prominently instead of as a dim footnote).
- `src/services/preferences.ts` — per-install `deviceId` (for quota) and the chosen target language, stored as JSON next to the error log.
- `src/types/vocabulary.ts` — shared `VocabularyItem` (`word`, `reading`, `vietnamese`, `example`, `example_vi` — names are language-neutral on purpose) / `ImageAnalysisResult` types.
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
