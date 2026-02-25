// Skia RuntimeShader GLSL (SkSL) source strings for looping scene overlay animations

import { Skia } from '@shopify/react-native-skia';
import type { SkRuntimeEffect } from '@shopify/react-native-skia';

export type ShaderType = 'fire' | 'rain' | 'water' | 'leaves' | 'mist' | 'none';

// ---------------------------------------------------------------------------
// SkSL shader sources — each accepts uniform float iTime and uniform float2 iResolution
// ---------------------------------------------------------------------------

const FIRE_SHADER = `
uniform float iTime;
uniform float2 iResolution;

float pseudoNoise(float2 p) {
  return fract(sin(dot(p, float2(12.9898, 78.233))) * 43758.5453);
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / iResolution;

  // Flickering intensity driven by layered sine waves and pseudo-noise
  float flicker = 0.5
    + 0.25 * sin(iTime * 6.0 + uv.x * 4.0)
    + 0.15 * cos(iTime * 8.5 + uv.y * 3.0)
    + 0.10 * pseudoNoise(float2(floor(iTime * 10.0), uv.x * 5.0));

  // Warm colour gradient — orange at top, deep red at bottom
  float3 warm = mix(
    float3(0.85, 0.25, 0.05),
    float3(1.0, 0.55, 0.1),
    uv.y
  );

  // Fade out toward edges to concentrate in centre
  float vignette = smoothstep(0.0, 0.35, uv.y) * smoothstep(1.0, 0.65, uv.y);
  float alpha = flicker * vignette * 0.18;

  return half4(half3(warm), half(alpha));
}
`;

const RAIN_SHADER = `
uniform float iTime;
uniform float2 iResolution;

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / iResolution;

  float alpha = 0.0;

  // Three layers of rain with different scales for parallax depth
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float scale = 40.0 + fi * 30.0;
    float speed = 1.8 + fi * 0.6;
    float thickness = 0.04 - fi * 0.01;

    // Tile coordinates
    float x = fract(uv.x * scale + fi * 3.7);
    float y = fract(uv.y * scale * 0.25 - iTime * speed + fi * 5.3);

    // Vertical streak
    float streak = smoothstep(0.5 - thickness, 0.5, x)
                 * smoothstep(0.5 + thickness, 0.5, x);

    // Limit vertical extent of each drop
    float drop = smoothstep(0.0, 0.15, y) * smoothstep(0.6, 0.3, y);

    alpha += streak * drop * (0.12 - fi * 0.025);
  }

  // Cool blue-gray rain colour
  float3 col = float3(0.6, 0.65, 0.75);
  return half4(half3(col), half(clamp(alpha, 0.0, 0.3)));
}
`;

const WATER_SHADER = `
uniform float iTime;
uniform float2 iResolution;

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / iResolution;

  // Only affect the lower third of the image (water reflection zone)
  float waterLine = 0.33;
  if (uv.y > waterLine) {
    return half4(0.0, 0.0, 0.0, 0.0);
  }

  float depth = 1.0 - uv.y / waterLine; // 0 at waterLine, 1 at bottom

  // Layered sine distortion for shimmer
  float wave1 = sin(uv.x * 25.0 + iTime * 2.0 + uv.y * 10.0) * 0.5 + 0.5;
  float wave2 = sin(uv.x * 40.0 - iTime * 1.5 + uv.y * 15.0) * 0.5 + 0.5;
  float wave = wave1 * 0.6 + wave2 * 0.4;

  float shimmer = wave * depth;

  // Cool blue-white highlight
  float3 col = mix(float3(0.3, 0.5, 0.7), float3(0.8, 0.9, 1.0), shimmer);
  float alpha = shimmer * depth * 0.22;

  return half4(half3(col), half(alpha));
}
`;

const LEAVES_SHADER = `
uniform float iTime;
uniform float2 iResolution;

float leafParticle(float2 uv, float seed) {
  // Particle centre drifts down and sways sideways
  float cx = fract(seed * 7.31 + sin(iTime * 0.4 + seed * 13.0) * 0.08);
  float cy = fract(seed * 3.17 - iTime * (0.06 + seed * 0.04));

  float2 delta = uv - float2(cx, cy);
  float dist = length(delta);

  // Small soft dot
  return smoothstep(0.012, 0.004, dist);
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / iResolution;

  float accumulator = 0.0;

  // Spawn a grid of leaf particles with staggered seeds
  for (int i = 0; i < 18; i++) {
    float seed = float(i) / 18.0;
    accumulator += leafParticle(uv, seed);
  }

  accumulator = clamp(accumulator, 0.0, 1.0);

  // Earthy green-brown leaf colour
  float3 col = mix(float3(0.25, 0.45, 0.15), float3(0.55, 0.35, 0.1), accumulator);
  float alpha = accumulator * 0.35;

  return half4(half3(col), half(alpha));
}
`;

const MIST_SHADER = `
uniform float iTime;
uniform float2 iResolution;

float fogNoise(float2 p, float t) {
  // Layered sine-based pseudo-Perlin noise
  float n = sin(p.x * 1.2 + t * 0.3) * cos(p.y * 0.9 - t * 0.2);
  n += 0.5 * sin(p.x * 2.5 - t * 0.5) * cos(p.y * 2.1 + t * 0.4);
  n += 0.25 * sin(p.x * 5.1 + t * 0.7) * cos(p.y * 4.7 - t * 0.3);
  return n * 0.5 + 0.5; // remap to 0..1
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / iResolution;

  // Scale UV for noise tiling
  float2 p = uv * 6.0;

  // Two drifting fog layers
  float n1 = fogNoise(p + float2(iTime * 0.15, 0.0), iTime);
  float n2 = fogNoise(p * 1.4 + float2(-iTime * 0.1, iTime * 0.08), iTime * 0.7);

  float fog = n1 * 0.6 + n2 * 0.4;

  // Fade toward top and bottom edges
  float vFade = smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.7, uv.y);
  fog *= vFade;

  // Semi-transparent white-gray
  float3 col = float3(0.85, 0.85, 0.88);
  float alpha = fog * 0.2;

  return half4(half3(col), half(alpha));
}
`;

// ---------------------------------------------------------------------------
// Exported shader source map
// ---------------------------------------------------------------------------

export const SHADER_SOURCES: Record<Exclude<ShaderType, 'none'>, string> = {
  fire: FIRE_SHADER,
  rain: RAIN_SHADER,
  water: WATER_SHADER,
  leaves: LEAVES_SHADER,
  mist: MIST_SHADER,
};

// ---------------------------------------------------------------------------
// Runtime effect factory
// ---------------------------------------------------------------------------

export function createShaderEffect(type: Exclude<ShaderType, 'none'>): SkRuntimeEffect | null {
  const source = SHADER_SOURCES[type];
  try {
    const effect = Skia.RuntimeEffect.Make(source);
    return effect;
  } catch (_error: unknown) {
    // Shader compilation failed — return null so the UI can fall back gracefully
    return null;
  }
}

// ---------------------------------------------------------------------------
// Keyword-based shader detection
// ---------------------------------------------------------------------------

interface KeywordRule {
  readonly type: Exclude<ShaderType, 'none'>;
  readonly keywords: readonly string[];
}

// Ordered by priority: rain > fire > water > mist > leaves
const KEYWORD_RULES: readonly KeywordRule[] = [
  {
    type: 'rain',
    keywords: ['rain', 'chuva', 'tempestade', 'storm'],
  },
  {
    type: 'fire',
    keywords: ['fire', 'torch', 'fogo', 'tocha', 'lareira', 'chama', 'vela', 'candle'],
  },
  {
    type: 'water',
    keywords: ['water', 'river', 'lake', 'sea', 'ocean', 'rio', 'lago', 'mar', 'oceano', 'fonte', 'fountain'],
  },
  {
    type: 'mist',
    keywords: ['mist', 'fog', 'névoa', 'neblina', 'sombr', 'dark', 'horror', 'cave', 'caverna', 'dungeon', 'masmorra'],
  },
  {
    type: 'leaves',
    keywords: ['forest', 'floresta', 'bosque', 'árvore', 'folha', 'leaf'],
  },
] as const;

export function detectShaderType(narrativeContext: string, setting: string): ShaderType {
  const combined = `${narrativeContext} ${setting}`.toLowerCase();

  for (const rule of KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      if (combined.includes(keyword)) {
        return rule.type;
      }
    }
  }

  return 'none';
}
