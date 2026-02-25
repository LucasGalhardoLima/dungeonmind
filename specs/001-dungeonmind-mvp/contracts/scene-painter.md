# Contract: Scene Painter

## Hook Interface

```typescript
interface UseSceneImageReturn {
  generateScene(prompt: ScenePrompt): Promise<void>;
  generatePortrait(prompt: PortraitPrompt): Promise<string>;  // Returns local file path
  currentImagePath: string | null;
  isGenerating: boolean;
}

interface ScenePrompt {
  setting: string;           // "Tavern interior, night, candlelit"
  characters: string[];      // Visual descriptions of present characters
  tone: 'tense' | 'triumphant' | 'ominous' | 'peaceful' | 'chaotic' | 'comedic';
  style_tokens: string[];    // World-specific: ["valdris_palette", "medieval_architecture"]
  negative_prompt: string;   // Always: "modern elements, text, watermark, photorealistic, 3d render, blurry"
}

interface PortraitPrompt {
  physical_description: string;  // Race, body type, age, distinguishing features
  equipment: string;             // Weapons, armor, accessories
  expression: string;            // Stoic, curious, mischievous, world-weary
  style_tokens: string[];        // "pixel_art_portrait, front_facing, bust_shot, valdris_aesthetic"
  seed: number;                  // Fixed per character for regeneration
}
```

## Replicate API Contract

**Model**: `stability-ai/sdxl` with LoRA `nerijs/pixel-art-xl`

**Request**:
```json
{
  "version": "<sdxl-version-hash>",
  "input": {
    "prompt": "<assembled from ScenePrompt>",
    "negative_prompt": "modern elements, text, watermark, photorealistic, 3d render, blurry",
    "width": 512,
    "height": 512,
    "num_outputs": 1,
    "scheduler": "K_EULER",
    "num_inference_steps": 25,
    "guidance_scale": 7.5
  }
}
```

**Flow**: POST prediction → Poll status every 1s → Download image on completion

## Image Specifications

| Property | Value |
|----------|-------|
| Resolution | 512x512 generated |
| Display | 1024x1024 (2x retina) |
| Sampling | Nearest-neighbor (no interpolation) |
| Format | PNG |
| Style | 16-bit pixel art, SNES/GBA aesthetic |

## World Palette (Valdris)

Rich blues, forest greens, torch oranges. Applied via style_tokens in every prompt.

## Timeout Handling

- Maximum: 15 seconds from request initiation
- On timeout: keep previous scene illustration visible (never show loading state)
- Retry once in background
- If retry fails: skip this illustration, continue narration

## Caching

- Storage: `expo-file-system` documentDirectory + `/scene-cache/`
- Filename: SHA-256 hash of prompt string → `{hash}.png`
- Before generating: check if hash exists in cache
- Cache eviction: LRU when total exceeds 100MB

## Shader Animations (Skia)

Post-generation looping effects applied via `RuntimeShader`:

| Effect | Trigger | Shader Type |
|--------|---------|-------------|
| Fire/torch flicker | Torch or fire in scene | Noise-based orange/red gradient |
| Rain | Rain/storm weather | Vertical streaks with parallax |
| Water shimmer | River, lake, sea | Sine-wave distortion |
| Falling leaves | Forest scene | Particle system |
| Mist/fog | Dark/horror scenes | Perlin noise overlay |

Shaders run on GPU — zero JS thread cost during animation.

## Portrait Generation

Same pipeline as scene generation but with portrait-specific configuration:
- LoRA weights tuned for character portraits
- Fixed seed per character (stored in Character.portrait_seed) for reproducibility
- Triggered once at end of character creation
- Stored as local file referenced by Character.portrait_path
