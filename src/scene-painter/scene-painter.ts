// Scene painter via Supabase generate-image edge function (server-side Replicate proxy)

import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import type { ScenePrompt } from '../types/scene-prompt';
import type { AdventureType, World } from '../types/entities';
import { IMAGE_CONFIG, DEFAULT_NEGATIVE_PROMPT } from '../types/scene-prompt';

const SUPABASE_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ??
  process.env['EXPO_PUBLIC_SUPABASE_URL'] ??
  '';

const SUPABASE_ANON_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_KEY ??
  process.env['EXPO_PUBLIC_SUPABASE_KEY'] ??
  '';

const GENERATE_IMAGE_URL = `${SUPABASE_URL}/functions/v1/generate-image`;

export function buildSceneTextPrompt(prompt: ScenePrompt): string {
  const characters = prompt.characters.join(', ');
  const styleString = prompt.style_tokens.join(', ');
  return [
    'pixel art scene',
    prompt.setting,
    characters,
    prompt.tone,
    styleString,
  ].join(', ');
}

const VALDRIS_BG_PROMPTS: Record<AdventureType, string> = {
  dungeon_crawl:
    'pixel art scene, vast dark dungeon interior, stone corridors, flickering torches on walls, mysterious glowing runes, ancient stone pillars, cobwebs, atmospheric lighting, high fantasy, medieval architecture, torch lighting',
  wilderness_exploration:
    'pixel art scene, epic wilderness landscape, dense ancient forest, winding mountain path, distant peaks, golden sunlight filtering through canopy, wild untamed nature, high fantasy, medieval architecture, torch lighting',
  political_intrigue:
    'pixel art scene, grand medieval throne room interior, ornate tapestries, candlelit chandeliers, marble columns, stained glass windows, shadowy alcoves, opulent and mysterious, high fantasy, medieval architecture',
  horror_survival:
    'pixel art scene, dark cursed landscape, twisted dead trees, eerie fog, crumbling ruins, faint ghostly light, ominous sky, foreboding atmosphere, high fantasy, medieval architecture, torch lighting',
};

const ASHENMOOR_BG_PROMPTS: Record<AdventureType, string> = {
  dungeon_crawl:
    'pixel art scene, decrepit gothic catacombs, crumbling stone arches, dripping water, flickering candlelight, iron chains on walls, ancient coffins, rat bones scattered, muted grays, blood red accents, gothic horror atmosphere',
  wilderness_exploration:
    'pixel art scene, desolate moorland at dusk, twisted dead trees, thick rolling fog, distant ruined manor silhouette, overgrown gravestones, pale moonlight, withered heather, muted grays, amber candlelight glow, gothic horror landscape',
  political_intrigue:
    'pixel art scene, decaying aristocratic ballroom, faded velvet curtains, cracked chandeliers with dripping candles, dusty portraits with watching eyes, cobwebbed grand staircase, muted grays, blood red carpet, gothic horror opulence',
  horror_survival:
    'pixel art scene, cursed swamp village at night, crooked wooden houses, lanterns swaying in wind, thick fog rising from black water, gnarled roots, distant church bell tower, muted grays, amber candlelight, blood red moon, gothic horror atmosphere',
};

const WORLD_BG_PROMPTS: Record<World, Record<AdventureType, string>> = {
  valdris: VALDRIS_BG_PROMPTS,
  ashenmoor: ASHENMOOR_BG_PROMPTS,
};

function buildAdventureBackgroundPrompt(world: World, adventureType: AdventureType): string {
  const worldPrompts = WORLD_BG_PROMPTS[world] ?? VALDRIS_BG_PROMPTS;
  return worldPrompts[adventureType];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function generateFilename(textPrompt: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    textPrompt,
  );
  return `${hash}.png`;
}

async function ensureCacheDir(cacheDir: string): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(cacheDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
  }
}

interface GenerateImageResponse {
  output: string[] | null;
  error?: string;
  status?: string;
}

function isGenerateImageResponse(value: unknown): value is GenerateImageResponse {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return 'output' in obj || 'error' in obj;
}

async function generateViaEdgeFunction(
  textPrompt: string,
  negativePrompt: string,
  seed?: number,
): Promise<string[]> {
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const body: Record<string, unknown> = {
      prompt: textPrompt,
      negative_prompt: negativePrompt,
      width: IMAGE_CONFIG.width,
      height: IMAGE_CONFIG.height,
      scheduler: IMAGE_CONFIG.scheduler,
      num_inference_steps: IMAGE_CONFIG.num_inference_steps,
      guidance_scale: IMAGE_CONFIG.guidance_scale,
      num_outputs: IMAGE_CONFIG.num_outputs,
    };
    if (seed !== undefined) {
      body.seed = seed;
    }

    const response = await fetch(GENERATE_IMAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429 && attempt < maxAttempts - 1) {
      await delay(10000 * (attempt + 1));
      continue;
    }

    if (!response.ok) {
      const errBody: unknown = await response.json().catch(() => null);
      const msg = isGenerateImageResponse(errBody) ? errBody.error : `status ${String(response.status)}`;
      throw new Error(`Image generation failed: ${msg ?? 'unknown'}`);
    }

    const result: unknown = await response.json();
    if (!isGenerateImageResponse(result)) {
      throw new Error('Invalid response from generate-image edge function');
    }

    if (result.error) {
      throw new Error(`Image generation error: ${result.error}`);
    }

    if (!result.output || result.output.length === 0) {
      throw new Error('Image generation succeeded but returned no output');
    }

    return result.output;
  }

  throw new Error('Image generation rate limited after retries');
}

async function downloadImage(remoteUrl: string, localPath: string): Promise<void> {
  const downloadResult = await FileSystem.downloadAsync(remoteUrl, localPath);

  if (downloadResult.status !== 200) {
    throw new Error(`Image download failed with status ${String(downloadResult.status)}`);
  }
}

async function attemptGeneration(prompt: ScenePrompt, cacheDir: string): Promise<string> {
  const textPrompt = buildSceneTextPrompt(prompt);
  const filename = await generateFilename(textPrompt);
  const localPath = `${cacheDir}${filename}`;

  // Check if scene already exists in cache
  const fileInfo = await FileSystem.getInfoAsync(localPath);
  if (fileInfo.exists) {
    return localPath;
  }

  await ensureCacheDir(cacheDir);

  // Generate via edge function (Replicate key stays server-side)
  const output = await generateViaEdgeFunction(textPrompt, prompt.negative_prompt);

  const imageUrl = output[0];
  if (typeof imageUrl !== 'string' || imageUrl.length === 0) {
    throw new Error('Image output URL is invalid');
  }

  await downloadImage(imageUrl, localPath);

  return localPath;
}

export async function generateScene(
  prompt: ScenePrompt,
  cacheDir: string,
): Promise<string | null> {
  // First attempt
  try {
    return await attemptGeneration(prompt, cacheDir);
  } catch (_firstError: unknown) {
    // Single background retry on failure before giving up
  }

  // Retry once
  try {
    return await attemptGeneration(prompt, cacheDir);
  } catch (_retryError: unknown) {
    // Return null — the UI will show a narrative fallback
    return null;
  }
}

/**
 * Generate a static background image for a campaign based on world + adventure type.
 * Called once at campaign creation. Returns local file path or null on failure.
 */
export async function generateAdventureBackground(
  world: World,
  adventureType: AdventureType,
  cacheDir: string,
): Promise<string | null> {
  const textPrompt = buildAdventureBackgroundPrompt(world, adventureType);
  const filename = await generateFilename(textPrompt);
  const localPath = `${cacheDir}${filename}`;

  // Check cache first
  const fileInfo = await FileSystem.getInfoAsync(localPath);
  if (fileInfo.exists) {
    return localPath;
  }

  await ensureCacheDir(cacheDir);

  try {
    const output = await generateViaEdgeFunction(textPrompt, DEFAULT_NEGATIVE_PROMPT);
    const imageUrl = output[0];
    if (typeof imageUrl !== 'string' || imageUrl.length === 0) return null;
    await downloadImage(imageUrl, localPath);
    return localPath;
  } catch {
    return null;
  }
}
