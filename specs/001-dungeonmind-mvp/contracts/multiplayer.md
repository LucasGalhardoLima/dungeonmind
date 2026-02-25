# Contract: Multiplayer

## Hook Interface

```typescript
interface UseMultiplayerReturn {
  createSession(): Promise<string>;          // Returns session code
  joinSession(code: string): Promise<void>;
  leaveSession(): Promise<void>;
  broadcastEvent(event: SessionEvent): void;
  onEvent(handler: (event: SessionEvent) => void): () => void;  // Returns unsubscribe
  isConnected: boolean;
  partnerConnected: boolean;
  partnerName: string | null;
  sessionCode: string | null;
  activePlayerId: string | null;             // Whose turn it is
}
```

## Session Event Types

Discriminated union with monotonic sequence numbers:

```typescript
type SessionEvent =
  | { type: 'narration_chunk'; text: string; sequence: number }
  | { type: 'narration_complete'; full_text: string; sequence: number }
  | { type: 'dice_requested'; dice_type: DiceType; context: string; requesting_player: string; sequence: number }
  | { type: 'dice_rolling'; player_id: string; seed: number; sequence: number }
  | { type: 'dice_result'; player_id: string; result: number; dice_type: string; sequence: number }
  | { type: 'scene_generating'; sequence: number }
  | { type: 'scene_ready'; image_url: string; prompt: string; sequence: number }
  | { type: 'chat_message'; player_id: string; content: string; layer: ChatLayer; sequence: number }
  | { type: 'player_connected'; player_id: string; sequence: number }
  | { type: 'player_disconnected'; player_id: string; sequence: number }
  | { type: 'turn_change'; active_player_id: string; sequence: number };

type ChatLayer = 'in_character' | 'out_of_character';
```

## Supabase Realtime Channel

- Channel name: `session:{session_code}` (e.g., `session:DRAGON-42`)
- Type: Broadcast (direct WebSocket messaging, no DB writes required)
- All events are idempotent with sequence numbers for ordering

## Session Code

- Format: `{WORD}-{NN}` — fantasy word + 2-digit number
- Examples: DRAGON-42, CRYSTAL-17, SHADOW-88
- Generated atomically in Supabase Edge Function with uniqueness check
- ~18,000 possible combinations (200 words x 90 numbers)
- Expires when session ends or after 24h inactivity

## Turn Management

- Cooperative turn order established at session start
- Players choose who goes first per exchange
- Only the active player's action is processed
- turn_change event broadcast when turn passes
- Non-active player can send out-of-character chat messages anytime

## Reconnection

| Scenario | Behavior |
|----------|----------|
| Disconnect < 30 seconds | Auto-recover on reconnect, fill gaps via sequence numbers |
| Disconnect 30s - 5 min | "Esperando [nome] reconectar..." shown to connected player |
| Disconnect > 5 minutes | Connected player offered option to continue solo |
| Both disconnect | Session state preserved in Supabase for up to 24h |

## State Sync

- Host device periodically syncs state_document and recent_history to Supabase sessions table
- On reconnect: rejoining player fetches missed events via sequence number gap detection
- Host's state is canonical on divergence

## Supabase Edge Functions

### create-session
- Generates unique session code
- Creates sessions row with 24h TTL
- Returns session code

### push-notification
- Sends turn reminder push via Expo Push API
- Only when app is in background/closed

### cleanup-expired
- Cron function: DELETE WHERE expires_at < now()
- Runs hourly
