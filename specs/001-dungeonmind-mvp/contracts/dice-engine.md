# Contract: Dice Engine

## Hook Interface

```typescript
interface UseDiceRollReturn {
  requestRoll(type: DiceType, context: string): void;
  result: number | null;
  isRolling: boolean;
  isCriticalHit: boolean;    // Natural 20
  isCriticalFail: boolean;   // Natural 1
  diceType: DiceType | null;
}

type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';
```

## Physics Configuration

Engine: Matter.js 0.19 running headless (no DOM renderer) via JSI.

| Parameter | Value | Notes |
|-----------|-------|-------|
| Restitution | 0.45 | Bounciness |
| Friction | 0.3 | Surface friction |
| Angular damping | 0.8 | Standard dice |
| Angular damping (d20) | 0.75 | 5% lower for longer tumble |
| Gravity | { x: 0, y: 1 } | Standard downward |
| Update rate | 60fps | Via requestAnimationFrame |

## Dice Face Geometry

Each dice type has correct face count and SVG-based face meshes:

| Type | Faces | Shape | Visual Size |
|------|-------|-------|-------------|
| d4 | 4 | Tetrahedron (2D projection) | Standard |
| d6 | 6 | Cube (2D projection) | Standard |
| d8 | 8 | Octahedron (2D projection) | Standard |
| d10 | 10 | Pentagonal trapezohedron | Standard |
| d12 | 12 | Dodecahedron (2D projection) | Standard |
| d20 | 20 | Icosahedron (2D projection) | 1.3x larger |

## Roll Initiation

Two methods, both always available (FR-024):

1. **Accelerometer shake**: magnitude > 1.5g (Android: 1.7g), 2+ readings in 500ms window
2. **Tap gesture**: tap on the dice body to roll

## Settle Detection

- Monitor angular velocity each physics frame
- Settled when: angular velocity < 0.1 rad/s sustained for 500ms (30 consecutive frames)
- On edge case (dice balanced on edge): apply small physics nudge. If still ambiguous after 2nd attempt, auto re-roll with narrative beat.

## Result Determination

Physics-based, not RNG (FR-015):
1. Get all face normal vectors from the current rotation
2. Find which face normal is most aligned with the world-up vector (0, -1)
3. That face's number is the result

## Animation Timing

- Throw to settle: 1.5–3 seconds
- Post-settle pause: 500ms before AI resumes narration
- d20: slightly slower settle (lower angular damping)

## Critical Detection

| Result | Condition | Animation | Audio |
|--------|-----------|-----------|-------|
| Natural 20 | d20 result === 20 | Gold particle burst (Skia shader) | Triumphant sting |
| Natural 1 | d20 result === 1 | Red shatter effect (Skia shader) | Deflating sting |

- First critical in session: animation cannot be skipped
- Subsequent: can be shortened (settings)

## Multi-Dice Rolls

- e.g., 2d6 for damage: show both dice simultaneously
- Independent physics bodies with independent settle detection
- Total calculated after all dice settle
- Each die has its own face-normal result calculation

## Multiplayer Broadcasting

```typescript
// On roll initiation
broadcast({ type: 'dice_rolling', player_id, seed: Date.now() });

// On settle
broadcast({ type: 'dice_result', player_id, result, dice_type });
```

- Remote devices show the same dice animation (visual sync via seed)
- All players frozen until rolling player's dice settles
- "Esperando [player name] rolar..." indicator shown
