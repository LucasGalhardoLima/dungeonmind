# Implementation Plan: DungeonMind MVP

**Branch**: `001-dungeonmind-mvp` | **Date**: 2026-02-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-dungeonmind-mvp/spec.md`

## Summary

Build the DungeonMind MVP — an AI-powered D&D mobile app for iOS and Android using React Native + Expo. The MVP delivers the complete core gameplay loop for 2 synchronous players: conversational character creation with pixel art portrait generation, an AI Dungeon Master engine (Claude Sonnet 4.6) with streaming narration and State Document-based campaign memory, physical 2D dice with Matter.js physics, pixel art scene illustration via Replicate (SDXL + LoRA), Supabase Realtime multiplayer, 3-layer in-game chat, and contextual notifications. Single world (Valdris — High Fantasy) with 4 adventure types. Brazilian Portuguese (pt-BR) only. Dark-first immersive UI with NativeWind.

## Technical Context

**Language/Version**: TypeScript 5.x strict mode (no `any`, no `as unknown`) on React Native 0.76+ with New Architecture (Fabric + JSI)
**Primary Dependencies**: Expo SDK 52+, Expo Router 4.0, NativeWind v4, Zustand 5, TanStack Query v5, @anthropic-ai/sdk 0.32+, @supabase/supabase-js 2.45+, matter-js 0.19, react-native-game-engine 1.2, @shopify/react-native-skia 1.5+, react-native-reanimated 3.16+, expo-sqlite 14, expo-font, expo-haptics, expo-sensors, expo-av, expo-notifications, expo-file-system, expo-image
**Storage**: Expo SQLite (local source of truth) + Supabase PostgreSQL (multiplayer session sync only, purged after 24h)
**Testing**: Jest + React Native Testing Library (unit/integration, colocated), Detox (E2E critical path)
**Target Platform**: iOS 18+ / Android 14+ (React Native + Expo — cross-platform single codebase)
**Project Type**: Mobile app (cross-platform)
**Performance Goals**: 60fps dice physics on iPhone 12+, <2s cold launch, <1.5s LLM first token, <300ms multiplayer broadcast latency, <500ms scene generation request initiation
**Constraints**: Offline-capable for non-AI features, max 12.5k input tokens per LLM call, State Document max 4k tokens, image generation max 15s timeout, pt-BR only
**Scale/Scope**: MVP for 2 synchronous players, 1 world (Valdris — High Fantasy), 4 adventure types, ~15 screens/flows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| §Immersion | PASS | All loading states masked with narrative animations (NFR-006). No forms — character creation is conversational (FR-001). Errors wrapped in narrator voice (FR-027). System operations invisible. No UI references to technology. |
| §Agency | PASS | AI never acts without player instruction (FR-028). Dice always delegated to player (FR-010). Player can always type free text. Contextual buttons are suggestions only. |
| §Dice | PASS | 2D physics via Matter.js with real bounce/tumble/settle (FR-015). Player initiates via shake or tap (FR-024). Natural 20/1 get special treatment (FR-017). Multiplayer broadcast (US-17). Never auto-rolled (FR-010). |
| §Character | PASS | Conversational creation, 5–8 exchanges (FR-001). Narrative questions only. Pixel art portrait generation (FR-002). Portrait reveal celebration (NFR-008). Dual mode toggle (FR-003). |
| §NarratorVoice | PASS | AI maintains DM role (FR-027). All errors/loading in narrative language. Session recaps in narrator voice (FR-014). All output in pt-BR (FR-030). |
| §Privacy | PASS | Local SQLite as source of truth (FR-004). Direct API calls, no intermediary (NFR-010). Supabase data scoped and purged in 24h (NFR-012). No account for solo play (NFR-011). No analytics transmitting gameplay. |
| §NoRealWorld | PASS | AI never references real world (FR-029). All content fictional. Enforced in system prompt. |
| §NoDarkPatterns | PASS | Free tier is genuinely playable (FR-026). No ads, data sales, or gamification. Conversion via value. Tier limits documented in constitution. |

**Result: ALL 8 GATES PASS — proceed to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/001-dungeonmind-mvp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── dm-engine.md
│   ├── dice-engine.md
│   ├── scene-painter.md
│   ├── multiplayer.md
│   └── persistence.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/                              # Expo Router file-based navigation
├── _layout.tsx                   # Root layout (providers, fonts, theme)
├── index.tsx                     # Entry — campaign hub
├── (campaign)/
│   ├── new/
│   │   ├── world.tsx             # World gallery
│   │   ├── adventure-type.tsx    # Adventure type selection
│   │   └── hooks.tsx             # Opening hooks selection
│   ├── [id]/
│   │   ├── _layout.tsx           # Campaign layout
│   │   ├── session.tsx           # Active session screen
│   │   ├── character.tsx         # Character sheet (dual mode)
│   │   └── history.tsx           # Session history (book view)
│   └── create-character.tsx      # Character creation conversation
├── (multiplayer)/
│   ├── create.tsx                # Create session + code
│   └── join.tsx                  # Join with code
└── settings.tsx                  # App settings (content toggle, notifications)

src/
├── engine/                       # DM Engine
│   ├── dm-engine.ts              # Core engine orchestrator
│   ├── prompt-builder.ts         # System prompt assembly
│   ├── state-document.ts         # State Document compression/hydration
│   ├── streaming.ts              # LLM streaming handler
│   ├── response-parser.ts        # Parse AI response for dice requests, scene changes
│   └── hooks/
│       └── use-dm-engine.ts      # React hook wrapping engine
├── dice/                         # Dice physics engine
│   ├── dice-engine.ts            # Matter.js setup + physics config
│   ├── dice-renderer.tsx         # Skia-based dice face rendering
│   ├── settle-detector.ts        # Angular velocity monitoring
│   ├── result-calculator.ts      # Face-normal → result mapping
│   └── hooks/
│       └── use-dice-roll.ts      # React hook for dice interaction
├── scene-painter/                # Pixel art generation
│   ├── scene-painter.ts          # Replicate API integration
│   ├── prompt-assembler.ts       # Scene prompt construction
│   ├── image-cache.ts            # Local file caching
│   ├── shader-animations.ts      # Skia looping shaders (fire, rain, etc.)
│   └── hooks/
│       └── use-scene-image.ts    # React hook for scene images
├── character/                    # Character system
│   ├── creation-flow.ts          # Conversation flow manager
│   ├── portrait-generator.ts     # Portrait-specific Replicate call
│   ├── character-sheet.ts        # Dual-mode data formatter
│   └── hooks/
│       └── use-character.ts
├── multiplayer/                  # Multiplayer system
│   ├── session-manager.ts        # Create/join/leave session
│   ├── realtime-channel.ts       # Supabase Realtime wrapper
│   ├── event-broadcaster.ts      # Typed event send/receive
│   ├── sync-engine.ts            # State reconciliation
│   └── hooks/
│       └── use-multiplayer.ts
├── persistence/                  # Local data layer
│   ├── database.ts               # Expo SQLite setup + migrations
│   ├── migrations/               # Versioned schema migrations
│   │   └── 001-initial.ts
│   ├── repositories/
│   │   ├── campaign-repository.ts
│   │   ├── character-repository.ts
│   │   ├── session-repository.ts
│   │   ├── exchange-repository.ts
│   │   ├── scene-image-repository.ts
│   │   ├── npc-repository.ts
│   │   └── notification-log-repository.ts
│   └── hooks/
│       └── use-repository.ts
├── notifications/                # Push + local notifications
│   ├── notification-service.ts
│   ├── notification-categories.ts
│   └── hooks/
│       └── use-notifications.ts
├── store/                        # Zustand global state
│   ├── campaign-store.ts
│   ├── session-store.ts
│   ├── multiplayer-store.ts
│   └── settings-store.ts
├── ui/                           # Shared UI components
│   ├── theme.ts                  # Colors, typography, spacing constants
│   ├── NarrationBubble.tsx
│   ├── ChatBubble.tsx
│   ├── CampaignCard.tsx
│   ├── WorldCard.tsx
│   ├── AdventureTypeCard.tsx
│   ├── HookCard.tsx
│   ├── CharacterPortrait.tsx
│   ├── SceneIllustration.tsx
│   ├── DiceOverlay.tsx
│   ├── NarrativeLoading.tsx      # Loading state masked as narrative
│   └── ActionButtons.tsx
└── types/                        # Shared TypeScript types
    ├── state-document.ts
    ├── session-events.ts
    ├── scene-prompt.ts
    ├── entities.ts
    └── dice.ts

supabase/
├── migrations/
│   └── 001-sessions.sql
└── functions/
    ├── create-session/
    ├── push-notification/
    └── cleanup-expired/
```

**Structure Decision**: Single Expo project with `app/` for file-based routing (Expo Router) and `src/` for all business logic organized by domain module. No monorepo. Supabase Edge Functions live in `supabase/functions/` for session management and push notifications.

## Complexity Tracking

> No constitution violations requiring justification. All gates pass.

| Decision | Rationale | Simpler Alternative Rejected Because |
|----------|-----------|--------------------------------------|
| Matter.js in JS thread via JSI | Constitution §Dice requires real physics — RNG is forbidden | Simple RNG would violate §Dice immutable principle |
| Dual LLM (Sonnet 4.6 + Gemini Flash 3.0) | Primary for quality narrative, fallback for cost on shorter exchanges | Single model would either overpay for simple calls or under-deliver on narrative quality |
| Expo SQLite as source of truth + Zustand cache | §Privacy requires local-first; Zustand provides fast runtime access | Cloud-first would violate §Privacy; Zustand-only lacks persistence |
