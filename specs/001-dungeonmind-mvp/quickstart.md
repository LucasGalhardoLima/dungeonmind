# Quickstart: DungeonMind MVP

**Phase**: 1 — Design & Contracts
**Date**: 2026-02-23

## Prerequisites

- **Node.js** 20+ (LTS)
- **Bun** (package manager)
- **Xcode** 16+ with iOS 18 SDK (macOS only, for iOS builds)
- **Android Studio** with Android 14 SDK (API 34)
- **Expo CLI**: `bun install -g expo-cli`
- **EAS CLI**: `bun install -g eas-cli`
- **Supabase CLI**: `brew install supabase/tap/supabase` (for local development)
- **API Keys**:
  - Anthropic (Claude Sonnet 4.6): https://console.anthropic.com
  - Replicate (SDXL + LoRA): https://replicate.com
  - Google AI (Gemini Flash 3.0 fallback): https://aistudio.google.com

## Project Setup

```bash
# 1. Create Expo project with router template
bunx create-expo-app dungeonmind --template tabs
cd dungeonmind

# 2. Install core dependencies
bun add expo-router@~4.0.0 expo-sqlite@~14.0.0 \
  @supabase/supabase-js@^2.45.0 @anthropic-ai/sdk@^0.32.0 \
  @shopify/react-native-skia@^1.5.0 react-native-reanimated@~3.16.0 \
  react-native-game-engine@^1.2.0 matter-js@^0.19.0 \
  zustand@^5.0.0 @tanstack/react-query@^5.60.0 \
  nativewind@^4.1.0 @react-navigation/native@^7.0.0 \
  expo-font expo-haptics expo-sensors expo-av \
  expo-notifications expo-file-system expo-image expo-constants

# 3. Install dev dependencies
bun add -d tailwindcss@^3.4.0 typescript@^5.6.0 \
  @types/matter-js jest @testing-library/react-native \
  detox @types/react

# 4. Initialize Tailwind
bunx tailwindcss init

# 5. Configure TypeScript strict mode (tsconfig.json)
# Ensure: "strict": true, "noUncheckedIndexedAccess": true

# 6. Set up Supabase local
supabase init
supabase start
```

## Environment Variables

Create `.env` at project root:

```bash
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
EXPO_PUBLIC_REPLICATE_API_TOKEN=r8_...
EXPO_PUBLIC_GEMINI_API_KEY=AI...
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Access via `process.env.EXPO_PUBLIC_*` (Expo injects at build time).

**Security note**: Client-side API keys are acceptable for MVP private beta. Must be moved to a proxy server (Supabase Edge Function) before public launch.

## Development Commands

| Command | Description |
|---------|-------------|
| `npx expo start` | Start Expo dev server |
| `npx expo run:ios` | Build and run on iOS simulator |
| `npx expo run:android` | Build and run on Android emulator |
| `bun test` | Run Jest + RNTL tests |
| `bun run detox:ios` | Run Detox E2E tests (iOS) |
| `bun tsc --noEmit` | TypeScript type check |
| `supabase start` | Start local Supabase |
| `supabase db reset` | Reset local database |
| `supabase functions serve` | Serve Edge Functions locally |

## Design System Quick Reference

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| background | `#1A1A2E` | Deep navy — base background |
| accent | `#C9A84C` | Gold — interactive elements, narration text |
| purple | `#4A2C6E` | Purple — AI content backgrounds, headers |
| text | `#F0F0F0` | Off-white — body text |
| muted | `#808080` | Gray — out-of-character text |
| danger | `#DC3232` | Red — critical failure |
| success | `#32CD32` | Green — critical success |

### Typography

- **Headings, campaign names, dramatic moments**: Geist Pixel (bundled OTF via expo-font)
- **Body text, chat, readable UI**: System font (SF Pro on iOS, Roboto on Android)

### Spacing & Radius

| Element | Border Radius |
|---------|---------------|
| Screen containers | 24px |
| Cards | 16px |
| Buttons | 12px |
| Chips | 8px |

### Haptics (expo-haptics)

| Event | Haptic Type |
|-------|-------------|
| Dice throw | Heavy impact |
| Dice settle | Medium impact |
| Critical result (nat 20/1) | Notification success/error |
| Note save | Light impact |
| Campaign start | Success notification |

## Implementation Order

1. **SQLite schema + repository layer** — Foundation for all data persistence
2. **DM Engine** — Prompt builder + streaming + State Document compression
3. **Dice physics** — Matter.js + settle detection + result calculation
4. **Character creation** — Conversational flow + portrait generation + reveal animation
5. **Campaign hub** — World/adventure type selection + hook generation + campaign cards
6. **Session screen** — Streaming narration + dice integration + scene painter
7. **Multiplayer** — Supabase Realtime + session code + shared dice
8. **Notifications** — Local + push notification system
9. **Polish** — Critical animations, haptics, typography, scene shaders

## Key Architectural Patterns

- **SQLite = source of truth**, Zustand = runtime cache. Write to SQLite first, then update store.
- **All LLM calls** go through `useDMEngine` hook (streaming, retry, error wrapping)
- **All image generation** goes through `useSceneImage` hook (caching, timeout, fallback)
- **Multiplayer events** are typed discriminated unions with monotonic sequence numbers
- **State Document compression** triggers: session end, >30 exchanges since last compression, or token budget would exceed 10k
- **No loading spinners** — all waits masked with narrative animations per §Immersion
- **All text in pt-BR** — UI labels, AI narration, notifications, error messages
