# Contract: DM Engine

## Hook Interface

```typescript
interface UseDMEngineReturn {
  sendAction(text: string): Promise<void>;
  streamingText: string;        // Current narration being streamed
  isStreaming: boolean;
  diceRequest: DiceRequest | null;  // Set when AI requests a roll
  submitDiceResult(result: number): Promise<void>;
  scenePrompt: ScenePrompt | null;  // Set when scene change detected
  suggestedActions: string[];       // Contextual action buttons
  error: NarrativeError | null;     // Narrative-wrapped error
}

interface DiceRequest {
  dice_type: DiceType;
  context: string;           // e.g., "Arcana check to decipher the rune"
  requesting_player: string;
}

interface NarrativeError {
  narrative: string;         // In-character error message (pt-BR)
  technical: string;         // Hidden technical detail for logging
  retryable: boolean;
}
```

## System Prompt Assembly

Each LLM call assembles 7 prompt sections (total budget: ~12,500 input tokens):

1. **world_definition** (~300 tokens): The 4-attribute world object (fundamental rule, central tension, what cannot exist here, aesthetic identity) — static per world, never changes mid-campaign. MVP: Valdris (High Fantasy)
2. **adventure_type_definition** (~200 tokens): The 5-attribute adventure type object (structure, pacing, primary challenge, dice usage pattern, duo suitability) — static per campaign, set at creation
3. **dm_persona** (~800 tokens): Always 2nd person, present tense, never break character, never refuse ("that is not possible"), pt-BR, family-friendly (or mature if enabled)
4. **d&d_rules_reference** (~700 tokens): Core mechanic summary, skill check DCs, combat rules — injected contextually
5. **campaign_state_document** (max 4,000 tokens): Compressed campaign memory
6. **recent_history** (max 5,000 tokens): Last 20 raw exchanges
7. **current_player_action** (max 500 tokens): The player's current input

## Response Parsing

The AI response is parsed for structured signals embedded in the narrative:

```typescript
interface ParsedResponse {
  narration: string;                    // The narrative text to stream
  dice_request?: {
    dice_type: DiceType;
    context: string;
    skill?: string;                     // e.g., "Arcana", "Athletics"
  };
  scene_change?: {
    trigger: SceneTrigger;
    scene_prompt: ScenePrompt;
  };
  suggested_actions?: string[];         // 2-4 contextual action buttons
  character_updates?: {
    hp_delta?: number;
    xp_delta?: number;
    inventory_add?: string[];
    inventory_remove?: string[];
  };
  npc_updates?: Array<{
    name: string;
    trust_delta?: number;
    fear_delta?: number;
    anger_delta?: number;
    gratitude_delta?: number;
  }>;
}
```

## Streaming

- Uses `@anthropic-ai/sdk` `.stream()` method
- Tokens arrive via `content_block_delta` events
- UI renders each token immediately (word-by-word narration effect)
- Parsing happens on the accumulated text after stream completes

## Error Handling

- 3 retries with exponential backoff: 1s, 2s, 4s
- On all retries exhausted: show narrative error ("As estrelas obscurecem a visão... Tente novamente, aventureiro.")
- Fallback to Gemini Flash 3.0 on persistent Anthropic API failure

## State Document Compression

**Trigger**: session end, exchange count > 30 since last compression, or token budget would exceed 10k

**Input**: current State Document + new raw exchanges + NPC states + character stats

**Output**: updated StateDocument JSON (max 4,000 tokens)

**Validation**: schema correctness, token count <= 4000, no data loss for active quests/NPCs
