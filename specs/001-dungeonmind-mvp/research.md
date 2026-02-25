# Research: DungeonMind MVP

**Phase**: 0 — Outline & Research
**Date**: 2026-02-23
**Status**: Complete — all unknowns resolved

## TOPIC 1: Matter.js in React Native via react-native-game-engine

**Decision**: Use matter-js 0.19 running headless (no DOM renderer) in the JS thread via JSI, with react-native-game-engine providing the game loop, and @shopify/react-native-skia for rendering dice faces.

**Rationale**:
- Matter.js runs as a pure JavaScript physics simulation — it does not require a DOM or Canvas element
- On React Native 0.76+ with New Architecture, JS executes via JSI (JavaScript Interface) with near-native performance, eliminating the old bridge overhead
- react-native-game-engine provides a `GameEngine` component with a `requestAnimationFrame`-based update loop at 60fps
- Physics runs headless: Matter.js `Engine.update()` is called each frame, body positions are read, and Skia renders the dice visually
- No WebView needed — this avoids the performance overhead of embedding a browser for physics
- react-native-game-engine is lightly maintained but stable (last meaningful update 2023). The API is minimal (~200 LOC wrapper). If abandoned, trivially replaceable with a custom `useEffect` + `requestAnimationFrame` loop

**Alternatives Considered**:

| Alternative | Why Rejected |
|---|---|
| Rapier.js via WASM | WASM support in React Native's Hermes engine is experimental. Risk of crashes or unavailability on older devices |
| WebView + Canvas | Adds ~50-100ms render latency per frame due to bridge communication. Cannot achieve 60fps reliably |
| Custom physics | Dice physics requires collision detection, angular momentum, and settling — implementing from scratch is error-prone |
| react-native-skia's built-in physics | Skia is a rendering engine, not a physics engine. No collision detection or rigid body dynamics |

**Key Risks**:
1. JS thread contention during physics simulation + LLM streaming. Mitigation: physics only runs during dice rolls (5-15 seconds), not during narration streaming.
2. react-native-game-engine compatibility with New Architecture. Mitigation: test immediately; if incompatible, replace with a 30-line custom game loop.

---

## TOPIC 2: Expo SQLite with Migrations (SDK 52)

**Decision**: Use expo-sqlite v14 with synchronous API, custom versioned migrations in TypeScript, and a repository pattern for data access.

**Rationale**:
- expo-sqlite v14 (Expo SDK 52) provides a synchronous SQLite API via JSI — no async bridge overhead
- SQLite WAL mode enables concurrent reads during writes, critical for saving exchanges while the UI reads campaign data
- Migration strategy: a `migrations/` directory with numbered TypeScript files (001-initial.ts, 002-add-field.ts). On app launch, check a `schema_version` table and run pending migrations
- Repository pattern: one repository class per entity with typed methods (create, getById, update, delete, plus entity-specific queries)

**Migration Pattern**:
```typescript
// src/persistence/migrations/001-initial.ts
export const version = 1;
export function up(db: SQLiteDatabase): void {
  db.execSync(`CREATE TABLE campaign (...);`);
  db.execSync(`CREATE TABLE character (...);`);
  // ...
}
```

**Performance**: SQLite handles frequent writes well. Inserting an exchange record takes <1ms. Saving after every narrative exchange (FR-004) is feasible without perceptible latency.

**Alternatives Considered**:

| Alternative | Why Rejected |
|---|---|
| WatermelonDB | Adds abstraction layer over SQLite. Heavier dependency. expo-sqlite is built into Expo |
| Realm | Third-party dependency with its own sync engine. Violates constitution anti-pattern §8 (minimize third-party deps) |
| AsyncStorage (for everything) | Not designed for relational data. No queries, no indexes, no joins. Unsuitable for campaign/session data |
| Drizzle ORM | Adds a dependency for ORM features. The repository pattern gives us type safety with less overhead |

**Key Risks**:
1. expo-sqlite API changes between SDK versions. Mitigation: pin SDK version, test before upgrading.
2. SQLite file corruption on app crash during write. Mitigation: WAL mode provides crash recovery.

---

## TOPIC 3: Anthropic SDK Streaming in React Native

**Decision**: Use @anthropic-ai/sdk with `.stream()` method for token-by-token narration delivery. Fallback to Gemini Flash 3.0 via direct HTTP for shorter exchanges. API keys stored in .env via expo-constants.

**Rationale**:
- The Anthropic SDK uses the Fetch API internally. React Native 0.76+ ships with a modern Fetch implementation
- The `.stream()` method returns an async iterator yielding `MessageStreamEvent` objects including `content_block_delta` events with text deltas
- Streaming pattern:
  ```typescript
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: systemPrompt,
    messages: conversationHistory,
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      onToken(event.delta.text);
    }
  }
  ```

**API Key Security**:
- MVP approach: API keys in EXPO_PUBLIC_ env vars, embedded in the client bundle
- This is acceptable for MVP (private beta) but MUST be moved to a proxy server before public launch
- The proxy server would be a Supabase Edge Function that forwards requests to Anthropic/Gemini, adding the API key server-side
- Rate limiting on the proxy prevents abuse

**Fallback Strategy**:
- Primary: Claude Sonnet 4.6 for all narrative exchanges (character creation, campaign narration, session summaries)
- Fallback: Gemini Flash 3.0 for opening hook generation and State Document compression (shorter, less narrative-critical)
- Fallback trigger: if primary fails after 3 retries with exponential backoff (1s, 2s, 4s)

**Alternatives Considered**:

| Alternative | Why Rejected |
|---|---|
| Server-side proxy from day 1 | Adds infrastructure complexity for MVP. Direct client calls are simpler for initial development |
| Vercel AI SDK | Designed for web, not React Native. Adds unnecessary abstraction |
| react-native-sse | Only needed if the Anthropic SDK's fetch-based streaming fails in RN. Keep as backup |

**Key Risks**:
1. React Native's Fetch streaming support may have edge cases. **Must validate in Phase 3 Sprint 1** — create a minimal test app that streams from the Anthropic API.
2. API key exposure in client bundle. Acceptable for MVP private beta; must proxy before public launch.

---

## TOPIC 4: Replicate API for Image Generation

**Decision**: Use Replicate's HTTP API directly (no SDK) with `stability-ai/sdxl` + `nerijs/pixel-art-xl` LoRA. Cache images locally via expo-file-system with prompt-hash filenames. 15-second timeout with graceful fallback.

**Rationale**:
- Replicate's API is a simple REST interface: POST to create a prediction, poll for completion (or use webhooks)
- The `nerijs/pixel-art-xl` LoRA produces consistent 16-bit pixel art style when combined with SDXL
- Image generation flow:
  1. DM Engine generates a structured ScenePrompt JSON
  2. Scene Painter converts ScenePrompt to a Replicate API prediction request
  3. Poll prediction status every 1 second until complete or timeout
  4. Download the image and cache locally

**Caching Strategy**:
- Filename: SHA-256 hash of the prompt string → `{hash}.png`
- Storage: expo-file-system documentDirectory + `/scene-cache/`
- Before generating, check if the hash already exists in cache
- Cache eviction: LRU when total cache exceeds 100MB

**Timeout Handling**:
- 15-second maximum from request initiation to image availability
- If timeout: keep the previous scene illustration visible (per NFR-006, no loading states)
- Retry once in background; if second attempt also fails, skip this scene illustration
- The narrative continues regardless — missing an illustration is better than breaking immersion

**Alternatives Considered**:

| Alternative | Why Rejected |
|---|---|
| Together AI | Similar API but fewer pixel art LoRA options. Replicate has the specific nerijs/pixel-art-xl model |
| Local on-device generation | Not feasible on mobile. SDXL requires GPU compute beyond mobile capabilities |
| Pre-generated image library | Violates the spec — scenes must be contextually generated, not generic |
| DALL-E 3 / Midjourney | No pixel art LoRA support. Style consistency would be poor |

**Key Risks**:
1. Replicate cold starts can exceed 15 seconds for SDXL models. Mitigation: use the "warm" model option if available, or pre-warm with a dummy request at session start.
2. LoRA quality variation. Mitigation: include strong style tokens and negative prompts in every request.
3. API costs. SDXL generation: ~$0.005/image. At 3-5 images per session: ~$0.015-0.025/session. Manageable for MVP.

---

## TOPIC 5: Supabase Realtime for Multiplayer

**Decision**: Use Supabase Realtime Broadcast channels (one channel per session, keyed by session code). All events are typed discriminated unions with monotonic sequence numbers for idempotent handling.

**Rationale**:
- Supabase Realtime Broadcast is a direct WebSocket messaging system — no database writes required for event delivery
- Lower latency than Postgres Changes (which require DB write → change detection → notification)
- Channel name: `session:{session_code}` (e.g., `session:DRAGON-42`)
- All events include a `sequence` field for ordering and gap detection

**Session Code Format**: `{WORD}-{NUMBER}` where WORD is from a curated list of ~200 fantasy words and NUMBER is 10-99. Examples: DRAGON-42, CRYSTAL-17, SHADOW-88. Generated atomically in a Supabase Edge Function with uniqueness check.

**Connection Recovery**:
- Supabase Realtime client has built-in reconnection with exponential backoff
- On reconnect: re-subscribe to channel automatically
- Gap recovery: host player persists events to Supabase PostgreSQL as backup. On reconnect, rejoining player fetches events with seq > lastSeenSeq
- Presence tracking via Supabase Presence for online/offline status

**Alternatives Considered**:

| Alternative | Why Rejected |
|---|---|
| Firebase Realtime Database | Adds a Google dependency alongside Supabase. Stack fragmentation |
| Socket.io with custom server | Requires maintaining a WebSocket server. More infrastructure |
| WebRTC data channels | Complex NAT traversal, unreliable on mobile networks |
| Supabase Postgres Changes | Higher latency (requires DB write first). Broadcast is direct |

**Key Risks**:
1. Mobile connection drops during WiFi/cellular handoff. Mitigation: built-in reconnection + sequence-number gap recovery.
2. Supabase free tier limits (200 concurrent Realtime connections, 2M messages/month). Sufficient for MVP.

---

## TOPIC 6: NativeWind v4 with Expo SDK 52

**Decision**: Use NativeWind v4 with dark-first CSS custom properties theme. Integrate Geist Pixel font via expo-font. No light mode in MVP.

**Rationale**:
- NativeWind v4 compiles Tailwind CSS classes to React Native StyleSheet objects at build time via Babel plugin and Metro transformer
- Dark theme via CSS custom properties in `global.css`:
  ```css
  :root {
    --color-background: 26 26 46;     /* #1A1A2E */
    --color-accent: 201 168 76;       /* #C9A84C */
    --color-purple: 74 44 110;        /* #4A2C6E */
  }
  ```
- Geist Pixel loaded via `useFonts` hook in root `_layout.tsx`, configured in `tailwind.config.ts` as `fontFamily: { pixel: ['GeistPixel-Regular'] }`

**Alternatives Considered**:

| Alternative | Why Rejected |
|---|---|
| Tamagui | More opinionated, steeper learning curve. Heavier bundle |
| StyleSheet.create (vanilla) | No utility classes, verbose. Hard to maintain design consistency |
| Unistyles | Less ecosystem support than NativeWind |
| Gluestack UI | Too opinionated for a game UI that needs full visual control |

**Key Risks**:
1. NativeWind v4 Metro/Babel configuration can be finicky after Expo SDK updates. Set up and validate first.
2. Geist Pixel font licensing — verify commercial use is permitted. Fallback: "Press Start 2P" (Google Fonts, open license).

---

## TOPIC 7: @shopify/react-native-skia for Pixel Art Rendering

**Decision**: Use react-native-skia 1.5+ for dice face rendering, GPU shader animations (fire, rain, water effects), and pixel art display with nearest-neighbor sampling.

**Rationale**:
- Skia's `RuntimeShader` enables GLSL-like shaders running on the GPU for looping atmospheric effects
- `filter: 'Nearest'` in Skia's Image component ensures pixel art edges are sharp (no interpolation/blurring)
- Images rendered at 2x pixel density (512×512 → 1024×1024 display) for crisp retina display
- Full New Architecture (Fabric + JSI) compatibility
- Shader types: fire (noise-based orange/red gradient), rain (vertical streaks with parallax), water shimmer (sine-wave distortion), particle effects (gold burst for nat 20, red shatter for nat 1)

**Alternatives Considered**:

| Alternative | Why Rejected |
|---|---|
| Reanimated only | Cannot do custom shaders or nearest-neighbor image sampling |
| expo-gl + WebGL | Lower-level API, more boilerplate. Skia provides higher-level React API |
| Lottie | Pre-composed animations — cannot be dynamic based on game state |
| Unity/Godot embedded | 50MB+ bundle overhead for shader overlays on static images |

**Key Risks**:
1. Shader development complexity. Mitigation: start with simple effects (fire = animated noise, rain = moving lines).
2. GPU memory on older devices. Mitigation: only keep current scene in GPU memory; release previous scenes.

---

## TOPIC 8: Expo Router v4 File-Based Navigation

**Decision**: Use Expo Router v4 with route groups `(campaign)` and `(multiplayer)`, dynamic segments `[id]`, transparent modals for dice overlay, and standard modals for character sheet.

**Rationale**:
- File system maps directly to navigation structure — no manual route configuration
- Route groups `()` organize without adding URL segments
- Deep linking from notifications: push notification payloads include a `url` field (e.g., `/123/session`), and Expo Router handles URL parsing automatically
- Dice overlay: `presentation: 'transparentModal'` so the session screen is visible behind the rolling dice
- Character sheet: `presentation: 'modal'` with bottom-sheet style

**Key Risks**: Low — Expo Router v4 is mature and well-documented with Expo SDK 52.

---

## TOPIC 9: expo-sensors (Accelerometer) for Dice Shake Detection

**Decision**: Use expo-sensors Accelerometer API with 1.5g magnitude threshold, 500ms debounce window, require 2+ threshold-exceeding readings to trigger. Listen only when a dice roll is pending. Tap-to-roll is always the primary fallback.

**Rationale**:
- Shake magnitude = `sqrt(x² + y² + z²)`. Resting: ~1.0g, gentle shake: 1.5-2.0g
- 1.5g threshold filters out walking (1.1-1.3g) and phone pickup (1.2-1.4g)
- Sample rate: 10Hz (100ms intervals) — sufficient for shake detection, low battery impact
- Subscribe only during active dice roll window (~5-15 seconds), unsubscribe immediately after
- Platform adjustment: Android may need 1.7g threshold due to sensor noise

**Alternatives Considered**:

| Alternative | Why Rejected |
|---|---|
| react-native-sensors | Third-party when expo-sensors is built-in |
| DeviceMotion | More data than needed; Accelerometer alone is sufficient |
| Continuous listening | Wasteful of battery; only needed during dice roll |

**Key Risks**:
1. False positives while walking. Mitigation: require 2+ readings above threshold in 500ms.
2. Android sensor inconsistency on low-end devices. Mitigation: tap-to-roll is always available.

---

## Summary Decision Matrix

| Topic | Decision | Confidence | Highest Risk |
|---|---|---|---|
| Matter.js + game engine | matter-js headless + game-engine loop + Skia render | High | game-engine unmaintained (trivial to replace) |
| Expo SQLite | expo-sqlite v14 + custom migrations + repository pattern | High | API changes in future SDK updates |
| Anthropic SDK streaming | @anthropic-ai/sdk .stream() + Gemini fallback | Medium | RN fetch streaming support (**validate immediately**) |
| Replicate API | Direct HTTP + nerijs/pixel-art-xl + expo-file-system cache | High | Cold start latency exceeding 15s |
| Supabase Realtime | Broadcast channels + typed events + sequence numbers | High | Mobile connection drops (mitigated) |
| NativeWind v4 | NativeWind v4 + CSS variables dark theme + expo-font | Medium-High | Setup complexity with Metro/Babel |
| Skia rendering | react-native-skia 1.5+ for shaders + pixel art + dice | High | Shader development complexity |
| Expo Router v4 | File-based routing + route groups + modal patterns | High | Low risk — mature |
| expo-sensors | Accelerometer 1.5g + debounce + tap fallback | High | Android sensor inconsistency (tap fallback) |

## Immediate Validation Items (Phase 3, First Sprint)

1. **Streaming validation**: Create a minimal RN app that calls `@anthropic-ai/sdk` `.stream()` and verifies token-by-token delivery. This blocks the entire DM Engine.
2. **NativeWind v4 setup**: Configure Metro + Babel + CSS variables in the fresh Expo project. Verify dark theme on both platforms. This blocks all UI work.
3. **Replicate cold start benchmarking**: Make 10 prediction calls to nerijs/pixel-art-xl and measure latency distribution. If median exceeds 10s, evaluate alternatives.
4. **Skia + New Architecture**: Verify react-native-skia renders correctly with Fabric enabled. Test shader and nearest-neighbor image sampling.
