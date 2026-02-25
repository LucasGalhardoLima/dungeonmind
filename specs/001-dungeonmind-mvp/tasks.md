# Tasks: DungeonMind MVP

**Input**: Design documents from `/specs/001-dungeonmind-mvp/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Tests**: Not explicitly requested in the feature specification. Test tasks are NOT included. Tests can be added later via TDD approach if desired.

**Organization**: Tasks follow the implementation order from quickstart.md, grouped by functional domain. Each task is labeled with its user story for traceability.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2...)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and build configuration

- [x] T001 Create Expo project with tabs template using `bunx create-expo-app dungeonmind --template tabs`
- [x] T002 Install all core and dev dependencies per quickstart.md (expo-router, expo-sqlite, @supabase/supabase-js, @anthropic-ai/sdk, @shopify/react-native-skia, react-native-reanimated, react-native-game-engine, matter-js, zustand, @tanstack/react-query, nativewind, expo-font, expo-haptics, expo-sensors, expo-av, expo-notifications, expo-file-system, expo-image, expo-constants, tailwindcss, typescript, @types/matter-js, jest, @testing-library/react-native, detox, @types/react)
- [x] T003 [P] Configure TypeScript strict mode in tsconfig.json (strict: true, noUncheckedIndexedAccess: true)
- [x] T004 [P] Configure NativeWind v4 with dark-first CSS custom properties theme in tailwind.config.ts, global.css (--color-background: #1A1A2E, --color-accent: #C9A84C, --color-purple: #4A2C6E), babel.config.js, and metro.config.js
- [x] T005 [P] Set up environment variables in .env (EXPO_PUBLIC_ANTHROPIC_API_KEY, EXPO_PUBLIC_REPLICATE_API_TOKEN, EXPO_PUBLIC_GEMINI_API_KEY, EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY) and configure access via expo-constants in app.config.ts
- [x] T006 Create Expo Router file-based navigation directory structure: app/_layout.tsx, app/index.tsx, app/(campaign)/new/world.tsx, app/(campaign)/new/adventure-type.tsx, app/(campaign)/new/hooks.tsx, app/(campaign)/[id]/_layout.tsx, app/(campaign)/[id]/session.tsx, app/(campaign)/[id]/character.tsx, app/(campaign)/[id]/history.tsx, app/(campaign)/create-character.tsx, app/(multiplayer)/create.tsx, app/(multiplayer)/join.tsx, app/settings.tsx
- [x] T007 [P] Bundle Geist Pixel font OTF file into assets/ and configure expo-font loading with useFonts hook in app/_layout.tsx
- [x] T008 [P] Configure Supabase for remote project (updated .env.example with remote URL pattern)

**Checkpoint**: Project builds and runs on iOS simulator and Android emulator with dark navy background visible.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type definitions, database layer, state management, and design system that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Type Definitions

- [x] T009 [P] Define entity types (Player, Campaign, Character, Session, Exchange, SceneImage, NPC, NotificationLog, CampaignStatus, SubscriptionTier, Difficulty, SceneTrigger, ExchangeRole, NotificationCategory) per data-model.md in src/types/entities.ts
- [x] T010 [P] Define dice types (DiceType, DiceRequest) per contracts/dice-engine.md in src/types/dice.ts
- [x] T011 [P] Define StateDocument type (active_characters, session_events, npc_registry, active_quests, world_state, narrative_arc) per data-model.md in src/types/state-document.ts
- [x] T012 [P] Define ScenePrompt and PortraitPrompt types (setting, characters, tone, style_tokens, negative_prompt, seed) per contracts/scene-painter.md in src/types/scene-prompt.ts
- [x] T013 [P] Define SessionEvent discriminated union (11 event types with sequence numbers), ChatLayer, NarrativeError, ParsedResponse per contracts/multiplayer.md and contracts/dm-engine.md in src/types/session-events.ts

### Database & Repositories

- [x] T014 Implement SQLite database setup with WAL mode, foreign keys, and versioned migration runner in src/persistence/database.ts
- [x] T015 Create initial migration with all 8 tables (player, campaign, character, session, exchange, scene_image, npc, notification_log), all indexes, constraints, and CHECK clauses per data-model.md in src/persistence/migrations/001-initial.ts
- [x] T016 [P] Implement CampaignRepository (getActive, getByStatus, getActiveCount, archive, reactivate, complete, updateStateDocument, updateThumbnail, touchLastPlayed, incrementSessionCount) per contracts/persistence.md in src/persistence/repositories/campaign-repository.ts
- [x] T017 [P] Implement CharacterRepository (getByCampaignId, updateStats, updateInventory, updateHP, addXP, levelUp, updatePortrait) per contracts/persistence.md in src/persistence/repositories/character-repository.ts
- [x] T018 [P] Implement SessionRepository (getByCampaignId, getLatest, getActive, endSession, updateSummary, getWithSummaries) per contracts/persistence.md in src/persistence/repositories/session-repository.ts
- [x] T019 [P] Implement ExchangeRepository (getBySessionId, getRecent, getCount, getNextSequence, getByCampaignSinceSession) per contracts/persistence.md in src/persistence/repositories/exchange-repository.ts
- [x] T020 [P] Implement SceneImageRepository (getByCampaignId, getBySessionId, getLatest) per contracts/persistence.md in src/persistence/repositories/scene-image-repository.ts
- [x] T021 [P] Implement NPCRepository (getByCampaignId, getByName, updateEmotionalState, updateInteraction) per contracts/persistence.md in src/persistence/repositories/npc-repository.ts
- [x] T022 [P] Implement NotificationLogRepository (log, getCountToday, getLastByCategory, markTapped) per contracts/persistence.md in src/persistence/repositories/notification-log-repository.ts
- [x] T023 Implement useRepository hook for repository access via React context in src/persistence/hooks/use-repository.ts

### State Management

- [x] T024 [P] Implement campaign-store (active campaigns list, selected campaign, SQLite hydration on launch, write-through on mutations) in src/store/campaign-store.ts
- [x] T025 [P] Implement session-store (active session, streaming text, dice state, scene state) in src/store/session-store.ts
- [x] T026 [P] Implement settings-store (player preferences, mature content toggle, difficulty preference, notification preferences, SQLite hydration) in src/store/settings-store.ts
- [x] T027 [P] Implement multiplayer-store (connection state, partner info, session code, active player ID) in src/store/multiplayer-store.ts

### Design System & Root Layout

- [x] T028 Implement design system theme constants (colors: background #1A1A2E, accent #C9A84C, purple #4A2C6E, text #F0F0F0, muted #808080, danger #DC3232, success #32CD32; typography: GeistPixel for headings, system for body; spacing; border radius: screen 24px, cards 16px, buttons 12px, chips 8px) in src/ui/theme.ts
- [x] T029 [P] Create NarrativeLoading component with immersive narrative animation (never a spinner) for all loading states per NFR-006 in src/ui/NarrativeLoading.tsx
- [x] T030 Implement root layout with providers (QueryClientProvider, repository context, font loading via useFonts, dark theme application, SQLite database initialization, default anonymous Player record creation on first launch if none exists, Zustand store hydration from SQLite) in app/_layout.tsx

**Checkpoint**: Database initializes with all 8 tables, repositories perform CRUD operations, stores hydrate from SQLite on launch. App launches with dark theme and Geist Pixel font in <2 seconds.

---

## Phase 3: DM Engine (US9, US10, US12) — Core Gameplay Loop 🎯 MVP

**Goal**: The AI DM can receive player actions, stream narrative responses in pt-BR, request dice rolls, and maintain campaign memory across sessions via State Document compression.

**Independent Test**: A player types an action, sees streaming narration word-by-word, is asked to roll dice when the outcome is uncertain, and resumes a campaign with the AI remembering previous events.

### Implementation

- [x] T031 [US9] Implement system prompt builder assembling 7 sections (world_definition ~300 tokens, adventure_type_definition ~200 tokens, dm_persona ~800 tokens in pt-BR, d&d_rules_reference ~700 tokens, campaign_state_document max 4000 tokens, recent_history max 5000 tokens, current player action) per contracts/dm-engine.md in src/engine/prompt-builder.ts
- [x] T032 [US9] Implement LLM streaming handler using @anthropic-ai/sdk .stream() method with content_block_delta token delivery, 1500 max output tokens, and Gemini Flash 3.0 fallback on persistent failure in src/engine/streaming.ts
- [x] T033 [US9] Implement response parser extracting narration, dice_request (dice_type, context, skill), scene_change (trigger, scene_prompt), suggested_actions, character_updates (hp_delta, xp_delta, inventory changes), and npc_updates from AI response per contracts/dm-engine.md in src/engine/response-parser.ts
- [x] T034 [US12] Implement State Document compression (merge new exchanges + NPC states into StateDocument JSON, validate schema and ≤4000 tokens), narrative session summary generation (separate LLM call producing a readable chapter-style recap in pt-BR per FR-013), and hydration, triggered on session end, >30 exchanges, or token budget exceeding 10k in src/engine/state-document.ts
- [x] T035 [US9] Implement DM Engine orchestrator connecting prompt builder, streaming handler, response parser, and State Document with 3-retry exponential backoff (1s, 2s, 4s) and NarrativeError wrapping (in-character pt-BR error messages) in src/engine/dm-engine.ts
- [x] T036 [US9] [US10] [US12] Implement useDMEngine React hook exposing sendAction, streamingText, isStreaming, diceRequest, submitDiceResult, scenePrompt, suggestedActions, and error per contracts/dm-engine.md interface in src/engine/hooks/use-dm-engine.ts

**Checkpoint**: useDMEngine hook sends a player action, streams AI narration token by token in pt-BR, detects dice requests in the response, and compresses/restores campaign state via State Document.

---

## Phase 4: Dice Physics Engine (US14, US15, US16) — Physical Dice

**Goal**: A realistic 2D dice physics system where the player shakes or taps to roll, the dice bounces and settles naturally, the result is determined by physics (not RNG), and critical hits/failures get special animations.

**Independent Test**: A player shakes their device or taps to roll a d20, sees it bounce and settle in 1.5-3 seconds with 60fps physics, and a natural 20 triggers a gold particle burst with triumphant audio.

### Implementation

- [x] T037 [US14] Implement Matter.js headless physics setup with react-native-game-engine loop (restitution 0.45, friction 0.3, angular damping 0.8 standard / 0.75 for d20, gravity {x:0, y:1}, 60fps update rate) and screen-edge collision boundaries per contracts/dice-engine.md in src/dice/dice-engine.ts
- [x] T038 [US14] Implement settle detector monitoring angular velocity each physics frame (settled when <0.1 rad/s sustained for 500ms / 30 consecutive frames) with edge case handling (physics nudge on balanced edge, auto re-roll after 2nd attempt) per contracts/dice-engine.md in src/dice/settle-detector.ts
- [x] T039 [US14] Implement result calculator using face normal vectors — find which face normal is most aligned with world-up vector (0, -1) to determine the settled face number per contracts/dice-engine.md in src/dice/result-calculator.ts
- [x] T040 [US15] Implement Skia-based dice face renderer with SVG meshes for all 6 dice types (d4 tetrahedron, d6 cube, d8 octahedron, d10 pentagonal trapezohedron, d12 dodecahedron, d20 icosahedron at 1.3x size) with correct face geometry and number display per contracts/dice-engine.md in src/dice/dice-renderer.tsx
- [x] T041 [US14] [US16] Implement useDiceRoll React hook with requestRoll(type, context), result, isRolling, isCriticalHit (nat 20), isCriticalFail (nat 1), diceType, multi-dice support, and accelerometer shake detection (expo-sensors at 1.5g threshold, 2+ readings in 500ms, Android 1.7g) per contracts/dice-engine.md in src/dice/hooks/use-dice-roll.ts
- [x] T042 [US16] Create DiceOverlay component with: critical hit animation (gold particle burst via Skia RuntimeShader, triumphant audio sting via expo-av, heavy haptic), critical failure animation (red shatter via Skia RuntimeShader, deflating audio sting, error haptic), post-settle 500ms pause, first-in-session unskippable, and tap-to-roll fallback gesture in src/ui/DiceOverlay.tsx

**Checkpoint**: All 6 dice types render correctly, physics simulation runs at 60fps, dice settles with face-normal-based result, nat 20/1 trigger special Skia animations with audio and haptics. Shake and tap both initiate rolls.

---

## Phase 5: Character Creation (US1, US2, US3, US4) — Character System

**Goal**: A player creates their character through a 5-8 exchange conversation with the AI in pt-BR, gets a unique pixel art portrait generated and revealed with dramatic animation, can view their character in narrative or technical mode, and all data persists across app restarts.

**Independent Test**: A player has a narrative conversation, the AI derives class/race/stats, a pixel art portrait is generated via Replicate and revealed with a 2-second emergence animation, the character sheet toggles between modes, and the character survives an app restart.

### Implementation

- [x] T043 [US1] Implement character creation conversation flow manager: 5-8 narrative exchanges in pt-BR, AI asks story-based questions (never technical), derives class/race/attributes/starting equipment/backstory, suggests class and race with player override, asks name last, writes Character to SQLite on completion in src/character/creation-flow.ts
- [x] T044 [US2] Implement portrait generator using Replicate API: POST prediction with SDXL + nerijs/pixel-art-xl LoRA, poll every 1s, 512x512 resolution, K_EULER scheduler, 25 inference steps, 7.5 guidance scale, fixed seed per character for regeneration, 15s timeout with narrative fallback, save to expo-file-system in src/character/portrait-generator.ts
- [x] T045 [US3] Implement character sheet data formatter for dual mode: Narrative Mode (prose descriptions with stats woven in, e.g., "Guerreiro experiente, corpo forjado por anos de batalha") and Technical Mode (standard D&D 5e stat block with numbers, modifiers, saving throws, skills) in src/character/character-sheet.ts
- [x] T046 [US1] [US2] [US4] Implement useCharacter hook connecting creation flow, portrait generation, dual-mode formatting, and SQLite persistence (auto-save on every exchange, full state restoration on resume) in src/character/hooks/use-character.ts
- [x] T047 [US1] Create character creation screen with conversation UI: NarrationBubble for AI questions, free text input for player answers, streaming AI responses, progress indicator (exchange count), class/race suggestion with override option in app/(campaign)/create-character.tsx
- [x] T048 [US2] Create CharacterPortrait component with: "O artista está desenhando seu personagem..." narrative loading animation (never a spinner), dramatic emergence reveal from darkness (Reanimated, minimum 2s, unskippable on first view per NFR-008), and success haptic on reveal in src/ui/CharacterPortrait.tsx
- [x] T049 [US3] Create character sheet screen with narrative/technical mode toggle (single tap, no navigation change), accessible from in-session HUD, displaying current stats/inventory/backstory/portrait in app/(campaign)/[id]/character.tsx
- [x] T050 [US4] Implement campaign resume state restoration: load character, recent exchanges, State Document, NPC states, and scene image from SQLite on campaign entry — verify all data intact after app restart in app/(campaign)/[id]/_layout.tsx

**Checkpoint**: Full character creation conversation → portrait generated via Replicate → dramatic 2-second reveal → character sheet toggles between narrative/technical mode → app restart restores all character data from SQLite.

---

## Phase 6: Campaign Flow (US5, US6, US7, US8) — Campaign Management

**Goal**: A player browses worlds in a visual gallery with ambient audio, selects an adventure type, picks from 3 AI-generated opening hooks, and manages active campaigns from a central hub.

**Independent Test**: A player sees the Valdris world card with pixel art and ambient audio, selects an adventure type, sees 3 distinct hooks, picks one to start the campaign, and the campaign appears in the hub with all metadata.

### Implementation

- [x] T051 [US5] Create WorldCard component with large pixel art image, world description text in pt-BR communicating fundamental rule and central tension (Valdris: "Os deuses estão mortos. Seu poder se fragmentou e espalhou pelo mundo. Cada reino foi construído sobre um fragmento — e os fragmentos estão desaparecendo."), 10-second ambient audio loop via expo-av, and locked/coming-soon state for post-MVP worlds (Ferrumclave, Vazio entre Estrelas, Thalassar, Cinzas de Umbra, Kenhado) in src/ui/WorldCard.tsx
- [x] T052 [US6] Create AdventureTypeCard component with gameplay structure descriptor and example opening line in pt-BR for 4 adventure types (Exploração de Masmorra, Exploração Selvagem, Intriga Política, Horror e Sobrevivência) in src/ui/AdventureTypeCard.tsx
- [x] T053 [US7] Create HookCard component displaying 2-3 sentence AI-generated opening hooks with selection gesture in src/ui/HookCard.tsx
- [x] T054 [US8] Create CampaignCard component showing campaign name, world badge, adventure type label, session count, last played date, and most recent scene thumbnail (via expo-image) in src/ui/CampaignCard.tsx
- [x] T055 [US5] Create world selection gallery screen with large visual cards layout (not a list), audio playback on focus, and world selection navigation in app/(campaign)/new/world.tsx
- [x] T056 [US6] Create adventure type selection screen with 4 AdventureTypeCards, adventure type description, and navigation to hooks screen after selection in app/(campaign)/new/adventure-type.tsx
- [x] T057 [US7] Create opening hooks screen: generate 3 hooks via useDMEngine for selected world + adventure type, display as HookCards, "Gerar mais opções" button for 3 new hooks, on selection → create Campaign in SQLite → navigate to character creation in app/(campaign)/new/hooks.tsx
- [x] T058 [US8] Create campaign hub screen (app entry point) with CampaignCard list for active campaigns, "Nova Campanha" action leading to world selection, free tier enforcement (1 active campaign, prompt to archive if slot full), and last-played sorting in app/index.tsx
- [x] T059 [US8] Implement campaign resume: tap CampaignCard → load campaign + character + recent exchanges from SQLite → navigate to session screen with full state restored in app/index.tsx

**Checkpoint**: Full campaign creation flow (world gallery → adventure type selection → 3 hooks → campaign starts). Campaign hub shows active campaigns with all metadata. Tapping a card resumes the campaign at exact last state.

---

## Phase 7: Session Screen (US9, US10, US18, US19) — Active Gameplay UI

**Goal**: The main gameplay screen where narration streams word-by-word, dice rolls happen inline, and pixel art scene illustrations with shader effects appear at scene changes — the core play experience.

**Independent Test**: A player sees streaming narration in pt-BR, taps to roll when the AI requests it, sees the result woven into continued narration, and a pixel art scene illustration with looping shader animation appears at location changes.

### Implementation

- [x] T060 [US18] Implement scene painter Replicate API integration (SDXL + nerijs/pixel-art-xl LoRA, prediction POST, 1s polling, image download, 15s timeout with keep-previous-image fallback, single background retry on failure) in src/scene-painter/scene-painter.ts
- [x] T061 [US19] Implement scene prompt assembler constructing ScenePrompt from current context (setting with location/time/atmosphere, character visual descriptions, tone mapping, Valdris style_tokens: high_fantasy_palette/medieval_architecture/torch_lighting, standard negative_prompt) per contracts/scene-painter.md in src/scene-painter/prompt-assembler.ts
- [x] T062 [US18] Implement image cache using expo-file-system documentDirectory + /scene-cache/, SHA-256 hash filenames, cache-before-generate check, and LRU eviction when total exceeds 100MB in src/scene-painter/image-cache.ts
- [x] T063 [US19] Implement Skia RuntimeShader looping animations: fire/torch flicker (noise-based orange/red gradient), rain (vertical streaks with parallax), water shimmer (sine-wave distortion), falling leaves (particle system), mist/fog (Perlin noise overlay) — GPU-rendered, zero JS thread cost in src/scene-painter/shader-animations.ts
- [x] T064 [US18] [US19] Implement useSceneImage hook with generateScene(ScenePrompt), generatePortrait(PortraitPrompt), currentImagePath, isGenerating, cache integration, and timeout handling per contracts/scene-painter.md in src/scene-painter/hooks/use-scene-image.ts
- [x] T065 [US9] Create NarrationBubble component for streaming AI narration text (word-by-word appearance, amber/gold #C9A84C color, slightly larger serif/italic font, Geist Pixel for dramatic moments) in src/ui/NarrationBubble.tsx
- [x] T066 [US9] Create ActionButtons component displaying 2-4 contextual suggested actions below narration as tappable chips (border radius 8px) with free text input always available in src/ui/ActionButtons.tsx
- [x] T067 [US18] Create SceneIllustration component with 500ms fade-in transition (Reanimated), nearest-neighbor rendering via Skia Image filter: 'Nearest' at 2x retina (512→1024), and shader animation overlay selection based on scene content in src/ui/SceneIllustration.tsx
- [x] T068 [US9] [US10] [US18] Create session screen integrating: SceneIllustration at top, scrollable narration stream with NarrationBubble, player text input at bottom, DiceOverlay as transparent modal on dice request, ActionButtons below latest narration, auto-save exchanges to SQLite after each exchange in app/(campaign)/[id]/session.tsx
- [x] T069 Create campaign layout with tab navigation between session and character sheet, session history access, and campaign-scoped state loading in app/(campaign)/[id]/_layout.tsx

**Checkpoint**: Full solo session experience: scene illustration at top with shader effects, streaming narration below, player types action → AI streams response → dice overlay appears on check → result integrated → new scene generated on location change. All exchanges auto-saved.

---

## Phase 8: Multiplayer (US21, US22, US17, US23) — Shared Adventures

**Goal**: Two players can create/join a multiplayer session via session code, see the same narration and scenes synchronized in real time, watch each other's dice rolls, and communicate via 3-layer chat with visual distinction.

**Independent Test**: Player A creates a session (gets code DRAGON-42), Player B joins, both see identical narration streaming, dice rolls broadcast in real time with "waiting for player" indicator, and chat messages appear on both devices with correct layer styling (narration amber, in-character with portrait, OOC muted gray).

### Implementation

- [x] T070 [US21] Create Supabase Edge Function for atomic session code generation (WORD-NN format from ~200 fantasy words x 90 numbers, uniqueness check against active sessions, 24h TTL) in supabase/functions/create-session/index.ts
- [x] T071 [US21] Create Supabase migration for multiplayer tables (sessions with session_code UNIQUE, state_document jsonb, recent_history jsonb, expires_at; session_players with character_data jsonb, is_connected boolean, composite PK) per data-model.md in supabase/migrations/001-sessions.sql
- [x] T072 [US21] Implement Supabase Realtime channel wrapper for subscribing/unsubscribing to session:{session_code} Broadcast channel with reconnection handling in src/multiplayer/realtime-channel.ts
- [x] T073 [US22] Implement typed event broadcaster for sending/receiving SessionEvent discriminated union (narration_chunk, narration_complete, dice_requested, dice_rolling, dice_result, scene_generating, scene_ready, chat_message, player_connected, player_disconnected, turn_change) with monotonic sequence numbers and idempotent handling per contracts/multiplayer.md in src/multiplayer/event-broadcaster.ts
- [x] T074 [US21] Implement session manager with createSession (call Edge Function, subscribe to channel), joinSession (enter code, subscribe), leaveSession (unsubscribe, update Supabase), and reconnection logic (<30s auto-recover, 30s-5min waiting state, >5min solo option) per contracts/multiplayer.md in src/multiplayer/session-manager.ts
- [x] T075 [US22] Implement state sync engine: host device periodically syncs state_document and recent_history to Supabase sessions table, sequence-number gap detection on reconnect, host state canonical on divergence in src/multiplayer/sync-engine.ts
- [x] T076 [US21] [US22] [US17] Implement useMultiplayer hook exposing createSession, joinSession, leaveSession, broadcastEvent, onEvent, isConnected, partnerConnected, partnerName, sessionCode, activePlayerId per contracts/multiplayer.md in src/multiplayer/hooks/use-multiplayer.ts
- [x] T077 [US23] Create ChatBubble component with 3 visual layers: narration (amber/gold #C9A84C, slightly larger serif/italic font), in-character (character name prefix + portrait avatar, world color palette), out-of-character (small muted gray #808080, bracketed "[...]") per spec US-23 in src/ui/ChatBubble.tsx
- [x] T078 [US21] Create multiplayer session creation screen with session code display (large Geist Pixel font), "Esperando parceiro..." state with cancel option, and connection status indicator in app/(multiplayer)/create.tsx
- [x] T079 [US21] Create multiplayer join screen with session code input field, "Conectando..." state, and error handling for invalid/expired codes in app/(multiplayer)/join.tsx
- [x] T080 [US23] Integrate 3-layer chat into session screen: in-character/out-of-character toggle button (single tap, not syntax), ChatBubble rendering for all message types, AI ignores OOC messages in app/(campaign)/[id]/session.tsx (extend)
- [x] T081 [US17] Integrate dice spectating into DiceOverlay: broadcast dice_rolling and dice_result events, display partner's dice animation synced via seed, "Esperando [player name] rolar..." indicator, pause narration for all until settle in src/ui/DiceOverlay.tsx (extend)
- [x] T082 [US22] Create Supabase Edge Function for push notification on turn change via Expo Push API (only when app in background/closed) in supabase/functions/push-notification/index.ts
- [x] T083 Create Supabase Edge Function for expired session cleanup (DELETE WHERE expires_at < now(), hourly cron) in supabase/functions/cleanup-expired/index.ts

**Checkpoint**: Two devices create/join session via code, see synchronized narration streaming, watch each other's dice rolls with real-time animation, communicate via 3-layer chat with correct visual styling. Reconnection works within 5 minutes. Expired sessions auto-cleaned.

---

## Phase 9: NPC & Difficulty Systems (US11, US13) — Depth Features

**Goal**: NPCs remember how the player treated them and respond accordingly through hidden emotional states. Difficulty adapts to player level and preference with death-prevention at lower levels.

**Independent Test**: An NPC whose trust was earned (via kind actions) shares information freely while a betrayed NPC is hostile. A Beginner player never dies on the first failure.

### Implementation

- [x] T084 [US11] Integrate NPC emotional state tracking into DM Engine: on npc_updates in ParsedResponse, apply trust/fear/anger/gratitude deltas (clamped 0-100) via NPCRepository.updateEmotionalState, create new NPC records on first encounter in src/engine/dm-engine.ts (extend)
- [x] T085 [US11] Integrate NPC registry into State Document compression: include NPC names with relationship classification (trusted/neutral/fearful/hostile) and last interaction summary in compressed state in src/engine/state-document.ts (extend)
- [x] T086 [US11] Add NPC emotional state context to system prompt builder: inject current NPC states from SQLite into the campaign_state_document section so the AI uses them for behavioral variation in src/engine/prompt-builder.ts (extend)
- [x] T087 [US13] Implement difficulty preference and content maturity integration in system prompt dm_persona section: adjust AI behavior for beginner (never kill on first failure, dramatic escapes), standard (death after multiple escalating failures), and hardcore (permanent death on critical failure); inject content safety rules — family-friendly by default per FR-031, mature mode when Campaign.mature_content is enabled per FR-032 in src/engine/prompt-builder.ts (extend)
- [x] T088 [US13] Add difficulty selection to character creation flow as a narrative question about risk preference ("Como você enfrenta o perigo?") mapped to beginner/standard/hardcore, stored on Campaign.difficulty in src/character/creation-flow.ts (extend)

**Checkpoint**: NPC emotional states persist in SQLite and influence AI behavior through the system prompt. Difficulty setting changes AI lethality and challenge scaling based on player preference.

---

## Phase 10: Notifications (US24, US25, US26) — Engagement

**Goal**: Players receive contextual push/local notifications for multiplayer turn reminders, session summary availability, and story continuation nudges after inactivity.

**Independent Test**: A player whose partner took an action gets a turn notification and taps it to resume. A session summary notification links to the recap. A 7-day inactive campaign sends one narrative nudge.

### Implementation

- [x] T089 [US24] [US25] [US26] Implement notification service with expo-notifications: permission request handling (contextual — first multiplayer join, not on app launch), local notification scheduling, push token registration, and rate limiting (max 3 notifications per day per campaign) in src/notifications/notification-service.ts
- [x] T090 [US24] [US25] [US26] Define notification categories and message templates in pt-BR: turn_reminder ("É a sua vez em '[Campaign Name]'!"), session_summary ("O resumo da sua sessão em '[Campaign Name]' está pronto."), campaign_nudge/story_continuation ("[Character Name] ainda espera em [location]. Continuar a aventura?") in src/notifications/notification-categories.ts
- [x] T091 [US24] [US25] [US26] Implement useNotifications hook with: contextual permission request, category-based scheduling, deep link URL generation for campaign resume, NotificationLogRepository integration for rate limiting, and 7-day inactivity monitoring in src/notifications/hooks/use-notifications.ts
- [x] T092 [US25] Integrate session summary notification trigger: after session end and summary generation completes, schedule local notification with campaign name and deep link to summary view in src/engine/dm-engine.ts (extend)
- [x] T093 [US26] Implement 7-day inactivity check: on app launch, scan campaigns where last_played_at > 7 days ago, schedule story_continuation notification (max 1 per campaign per 7-day period), respect per-campaign disable setting in src/notifications/notification-service.ts (extend)

**Checkpoint**: Turn notifications fire when partner acts in multiplayer. Session summary notification appears after session end with link to recap. Story nudge appears after 7 days of inactivity (max 1 per period, dismissible and disableable per campaign).

---

## Phase 11: Session History & Polish (US20) — Cross-Cutting Concerns

**Purpose**: Character portrait in scene, session history view, haptic feedback, accessibility, animations, and final validation

- [x] T094 [US20] Integrate character portrait overlay in SceneIllustration: small portrait frame in bottom corner during combat scenes, brief glow appearance before dice requests, styled with world visual aesthetic (golden border for Valdris) in src/ui/SceneIllustration.tsx (extend)
- [x] T095 Create session history screen with book-view layout: past sessions displayed as narrative chapters with summaries and inline scene illustrations, scrollable chronological order in app/(campaign)/[id]/history.tsx
- [x] T096 [P] Implement haptic feedback integration via expo-haptics throughout all interactive components: dice throw (heavy impact), dice settle (medium impact), nat 20 (notification success), nat 1 (notification error), note save (light impact), campaign start (success notification) per quickstart.md
- [x] T097 [P] Add accessibility throughout: accessible labels on all interactive elements, VoiceOver announcements for dice results and narration updates, Dynamic Type support for narration text scaling, tap-to-roll as primary dice interaction for motor accessibility per NFR-013
- [x] T098 Create app settings screen with: mature content toggle (defaults off per FR-032), notification preferences per campaign, difficulty preference display, and player display name editing in app/settings.tsx
- [x] T099 [P] Implement scene transition animations via Reanimated: 500ms fade-in for scene illustrations (NFR-007), bottom-sheet modal for character sheet, transparent modal for dice overlay, slide-from-bottom for all sheets and modals with dark overlay
- [x] T100 Run full validation against quickstart.md and spec.md success criteria: verify cold launch <2s on iPhone 12+ (SC-008), dice physics 60fps (NFR-002), LLM first token <1.5s (NFR-003), streaming narration word-by-word (NFR-006), multiplayer broadcast <300ms (NFR-005), all text in pt-BR (FR-030), no visible spinners (NFR-006), portrait reveal ≥2s (NFR-008)
- [x] T101 Implement data export and delete per FR-033 and §Privacy: export all campaign data (character JSON, session history, summaries, scene illustrations) as a shareable file via expo-file-system + expo-sharing, and permanent delete (single campaign wipe + full player data wipe with confirmation dialog in narrator voice) accessible from app/settings.tsx and campaign context menu
- [x] T102 Implement offline detection and narrative fallback per NFR-009: monitor network state via expo-network, show narrative offline message ("A aventura requer uma conexão com o mundo além...") when AI narration is unavailable, allow reading last session summary and character sheet offline, dice physics remain functional offline in src/ui/OfflineFallback.tsx and app/_layout.tsx (extend)

**Checkpoint**: All user stories implemented. Solo and multiplayer flows functional end-to-end. All constitutional principles verified (including §Privacy export/delete). App meets all success criteria and NFRs.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **DM Engine (Phase 3)**: Depends on Foundational (types + repositories)
- **Dice Physics (Phase 4)**: Depends on Foundational (types + theme) — **can run in parallel with Phase 3**
- **Character Creation (Phase 5)**: Depends on Phase 3 (DM Engine for AI conversation) + Phase 4 (dice for creation flow)
- **Campaign Flow (Phase 6)**: Depends on Phase 3 (DM Engine for hook generation) + Phase 5 (character creation follows campaign start)
- **Session Screen (Phase 7)**: Depends on Phases 3 + 4 (DM Engine + Dice) — integrates all systems into gameplay UI
- **Multiplayer (Phase 8)**: Depends on Phase 7 (extends session screen with sync)
- **NPC & Difficulty (Phase 9)**: Depends on Phase 3 (extends DM Engine prompt builder and response parser)
- **Notifications (Phase 10)**: Depends on Phase 8 (turn reminders) + Phase 7 (summary trigger)
- **Polish (Phase 11)**: Depends on all previous phases

### User Story Dependencies

| Story | Phase | Depends On | Priority |
|-------|-------|------------|----------|
| US9 (Narrative Exchange) | 3 | Phase 2 only | P1 |
| US10 (Dice Request) | 3 | Phase 2 only | P1 |
| US12 (Campaign Memory) | 3 | Phase 2 only | P1 |
| US14 (Physical Dice) | 4 | Phase 2 only | P1 |
| US15 (Dice Types) | 4 | Phase 2 only | P2 |
| US16 (Critical Hit/Fail) | 4 | US14 | P1 |
| US1 (Character Creation) | 5 | US9 (AI conversation) | P1 |
| US2 (Portrait Generation) | 5 | Phase 2 (Replicate pipeline independent) | P1 |
| US3 (Character Sheet) | 5 | US1 (needs character data) | P2 |
| US4 (Character Persistence) | 5 | US1 (needs character to persist) | P2 |
| US5 (World Selection) | 6 | Phase 2 only | P1 |
| US6 (Adventure Type Selection) | 6 | US5 | P2 |
| US7 (Campaign Hooks) | 6 | US9 (AI generates hooks) | P1 |
| US8 (Campaign Hub) | 6 | US4 (persisted campaigns) | P2 |
| US18 (Scene Generation) | 7 | Phase 2 (Replicate pipeline independent) | P1 |
| US19 (Scene Composition) | 7 | US18 + US9 (AI prompts) | P2 |
| US21 (Multiplayer Create/Join) | 8 | Phase 7 (session screen) | P1 |
| US22 (Shared State) | 8 | US21 | P2 |
| US17 (Dice Spectating) | 8 | US14 + US21 | P2 |
| US23 (3-Layer Chat) | 8 | US21 | P2 |
| US11 (NPC States) | 9 | US9 (DM Engine) | P3 |
| US13 (Difficulty) | 9 | US9 + US1 | P3 |
| US20 (Portrait in Scene) | 11 | US2 + US18 | P3 |
| US24 (Turn Notification) | 10 | US21 (multiplayer) | P3 |
| US25 (Summary Notification) | 10 | US12 (campaign memory) | P3 |
| US26 (Story Nudge) | 10 | US4 (campaign persistence) | P3 |

### Parallel Opportunities

**Within Phase 2** (biggest parallelism opportunity):
- All 5 type definition tasks (T009-T013) run in parallel
- All 7 repository tasks (T016-T022) run in parallel after T014-T015
- All 4 store tasks (T024-T027) run in parallel

**Phase 3 ∥ Phase 4**: DM Engine and Dice Physics are independent — can run in parallel

**Within Phase 5**:
- Portrait generator (T044) can run in parallel with creation flow (T043)
- Character sheet formatter (T045) can run in parallel with T043-T044

**Within Phase 6**:
- WorldCard (T051) ∥ AdventureTypeCard (T052) ∥ HookCard (T053) ∥ CampaignCard (T054)

**Within Phase 7**:
- Scene painter (T060) ∥ Prompt assembler (T061) ∥ Image cache (T062) ∥ Shader animations (T063)
- NarrationBubble (T065) ∥ ActionButtons (T066) ∥ SceneIllustration (T067)

**Within Phase 8**:
- Supabase Edge Functions (T070, T082, T083) run in parallel
- Channel wrapper (T072) ∥ Event broadcaster (T073)

---

## Parallel Example: Phase 2 — Foundational

```bash
# Wave 1: Launch all type definitions in parallel
Task: "Define entity types in src/types/entities.ts"
Task: "Define dice types in src/types/dice.ts"
Task: "Define State Document type in src/types/state-document.ts"
Task: "Define ScenePrompt types in src/types/scene-prompt.ts"
Task: "Define SessionEvent types in src/types/session-events.ts"

# Wave 2: Database setup (sequential)
Task: "Implement SQLite database setup in src/persistence/database.ts"
Task: "Create initial migration in src/persistence/migrations/001-initial.ts"

# Wave 3: Launch all repositories in parallel
Task: "Implement CampaignRepository in src/persistence/repositories/campaign-repository.ts"
Task: "Implement CharacterRepository in src/persistence/repositories/character-repository.ts"
Task: "Implement SessionRepository in src/persistence/repositories/session-repository.ts"
Task: "Implement ExchangeRepository in src/persistence/repositories/exchange-repository.ts"
Task: "Implement SceneImageRepository in src/persistence/repositories/scene-image-repository.ts"
Task: "Implement NPCRepository in src/persistence/repositories/npc-repository.ts"
Task: "Implement NotificationLogRepository in src/persistence/repositories/notification-log-repository.ts"

# Wave 4: Launch all stores in parallel
Task: "Implement campaign-store in src/store/campaign-store.ts"
Task: "Implement session-store in src/store/session-store.ts"
Task: "Implement settings-store in src/store/settings-store.ts"
Task: "Implement multiplayer-store in src/store/multiplayer-store.ts"
```

## Parallel Example: Phase 3 + Phase 4

```bash
# Agent A: DM Engine (Phase 3)
Task: "Implement prompt builder in src/engine/prompt-builder.ts"
Task: "Implement streaming handler in src/engine/streaming.ts"
Task: "Implement response parser in src/engine/response-parser.ts"
Task: "Implement State Document compression in src/engine/state-document.ts"
Task: "Implement DM Engine orchestrator in src/engine/dm-engine.ts"
Task: "Implement useDMEngine hook in src/engine/hooks/use-dm-engine.ts"

# Agent B: Dice Physics (Phase 4)
Task: "Implement Matter.js physics in src/dice/dice-engine.ts"
Task: "Implement settle detector in src/dice/settle-detector.ts"
Task: "Implement result calculator in src/dice/result-calculator.ts"
Task: "Implement dice face renderer in src/dice/dice-renderer.tsx"
Task: "Implement useDiceRoll hook in src/dice/hooks/use-dice-roll.ts"
Task: "Create DiceOverlay component in src/ui/DiceOverlay.tsx"
```

---

## Implementation Strategy

### MVP First (Phases 1-7 — Solo Play)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: DM Engine (US9, US10, US12) — validates core AI gameplay loop
4. Complete Phase 4: Dice Physics (US14, US15, US16) — validates physical dice experience
5. Complete Phase 5: Character Creation (US1, US2, US3, US4) — validates entry experience
6. Complete Phase 6: Campaign Flow (US5, US6, US7, US8) — validates campaign management
7. Complete Phase 7: Session Screen (US18, US19) — integrates everything into playable session
8. **STOP and VALIDATE**: Solo play should be fully functional end-to-end

### Incremental Delivery

| Milestone | Phases | What's Playable | Stories Covered |
|-----------|--------|-----------------|-----------------|
| Foundation | 1-2 | App launches with dark theme, DB ready | — |
| AI Core | 3 | Can test AI narration via hook | US9, US10, US12 |
| Dice Core | 4 | Can test dice physics independently | US14, US15, US16 |
| Character | 5 | Character creation end-to-end | US1, US2, US3, US4 |
| Campaign | 6 | Full campaign setup flow (world + adventure type) | US5, US6, US7, US8 |
| Solo MVP | 7 | **Complete solo play experience** | +US18, US19 |
| Multiplayer | 8 | **2-player shared adventure** | US21, US22, US17, US23 |
| Depth | 9 | NPC memory + difficulty scaling | US11, US13 |
| Engagement | 10 | Notifications for re-engagement | US24, US25, US26 |
| Polish | 11 | Production-ready with accessibility | US20 |

### Suggested MVP Scope

**Minimum Viable Demo**: Phases 1-7 (100 tasks → T001-T069)
- Delivers: Solo play with AI narration, physical dice, character creation with portrait, campaign management, and scene illustrations
- Validates: Core thesis (AI as DM), physical dice satisfaction, conversational character creation, pixel art quality
- Covers: 14 of 26 user stories (all P1 stories except US21)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [USn] label maps each task to its user story from spec.md
- All text content (AI prompts, UI labels, error messages, notifications) MUST be in pt-BR (FR-030)
- No loading spinners anywhere — use NarrativeLoading component (NFR-006)
- All image display uses nearest-neighbor sampling via Skia `filter: 'Nearest'` (no interpolation)
- Write to SQLite first, then update Zustand store (write-through pattern)
- Commit after each task or logical group of [P] tasks
- Stop at any checkpoint to validate the increment independently
