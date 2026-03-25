// Scene painter using Replicate API (SDXL + pixel-art-xl LoRA)

import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import type { ScenePrompt } from '../types/scene-prompt';
import type { AdventureType, World } from '../types/entities';
import { IMAGE_CONFIG, DEFAULT_NEGATIVE_PROMPT } from '../types/scene-prompt';

const REPLICATE_API_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_REPLICATE_API_KEY ??
  process.env['EXPO_PUBLIC_REPLICATE_API_KEY'] ??
  '';

const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';

// stability-ai/sdxl latest version hash
const SDXL_VERSION = '7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc';
const POLL_INTERVAL_MS = 1000;
const TIMEOUT_MS = 60000;

type PredictionStatus = 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';

interface ReplicatePrediction {
  id: string;
  status: PredictionStatus;
  output: string[] | null;
  error: string | null;
}

function isPredictionTerminal(status: PredictionStatus): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'canceled';
}

function isReplicatePrediction(value: unknown): value is ReplicatePrediction {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['status'] === 'string' &&
    ['starting', 'processing', 'succeeded', 'failed', 'canceled'].includes(
      obj['status'] as string,
    )
  );
}

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

const ADVENTURE_BG_PROMPTS: Record<AdventureType, string> = {
  dungeon_crawl:
    'pixel art scene, vast dark dungeon interior, stone corridors, flickering torches on walls, mysterious glowing runes, ancient stone pillars, cobwebs, atmospheric lighting, high fantasy, medieval architecture, torch lighting',
  wilderness_exploration:
    'pixel art scene, epic wilderness landscape, dense ancient forest, winding mountain path, distant peaks, golden sunlight filtering through canopy, wild untamed nature, high fantasy, medieval architecture, torch lighting',
  political_intrigue:
    'pixel art scene, grand medieval throne room interior, ornate tapestries, candlelit chandeliers, marble columns, stained glass windows, shadowy alcoves, opulent and mysterious, high fantasy, medieval architecture',
  horror_survival:
    'pixel art scene, dark cursed landscape, twisted dead trees, eerie fog, crumbling ruins, faint ghostly light, ominous sky, foreboding atmosphere, high fantasy, medieval architecture, torch lighting',
};

function buildAdventureBackgroundPrompt(_world: World, adventureType: AdventureType): string {
  return ADVENTURE_BG_PROMPTS[adventureType];
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

async function createPrediction(
  textPrompt: string,
  negativePrompt: string,
): Promise<ReplicatePrediction> {
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(REPLICATE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({
        version: SDXL_VERSION,
        input: {
          prompt: textPrompt,
          negative_prompt: negativePrompt,
          width: IMAGE_CONFIG.width,
          height: IMAGE_CONFIG.height,
          scheduler: IMAGE_CONFIG.scheduler,
          num_inference_steps: IMAGE_CONFIG.num_inference_steps,
          guidance_scale: IMAGE_CONFIG.guidance_scale,
          num_outputs: IMAGE_CONFIG.num_outputs,
        },
      }),
    });

    if (response.status === 429 && attempt < maxAttempts - 1) {
      // Rate limited — wait and retry
      await delay(10000 * (attempt + 1));
      continue;
    }

    if (!response.ok) {
      throw new Error(`Replicate API returned ${String(response.status)}`);
    }

    const body: unknown = await response.json();
    if (!isReplicatePrediction(body)) {
      throw new Error('Invalid prediction response from Replicate API');
    }

    return body;
  }

  throw new Error('Replicate API rate limited after retries');
}

async function pollPrediction(predictionId: string): Promise<ReplicatePrediction> {
  const pollUrl = `${REPLICATE_API_URL}/${predictionId}`;
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT_MS) {
    await delay(POLL_INTERVAL_MS);

    const response = await fetch(pollUrl, {
      headers: {
        Authorization: `Bearer ${REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Replicate poll returned ${String(response.status)}`);
    }

    const body: unknown = await response.json();
    if (!isReplicatePrediction(body)) {
      throw new Error('Invalid poll response from Replicate API');
    }

    if (isPredictionTerminal(body.status)) {
      return body;
    }
  }

  throw new Error('Scene generation timed out');
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

  // Create prediction
  let prediction = await createPrediction(textPrompt, prompt.negative_prompt);

  // Poll if not yet terminal
  if (!isPredictionTerminal(prediction.status)) {
    prediction = await pollPrediction(prediction.id);
  }

  // Validate result
  if (prediction.status !== 'succeeded') {
    const errorMsg = prediction.error ?? 'unknown error';
    throw new Error(`Prediction ${prediction.status}: ${errorMsg}`);
  }

  if (!prediction.output || prediction.output.length === 0) {
    throw new Error('Prediction succeeded but returned no output');
  }

  const imageUrl = prediction.output[0];
  if (typeof imageUrl !== 'string' || imageUrl.length === 0) {
    throw new Error('Prediction output URL is invalid');
  }

  // Download to local storage
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
    let prediction = await createPrediction(textPrompt, DEFAULT_NEGATIVE_PROMPT);
    if (!isPredictionTerminal(prediction.status)) {
      prediction = await pollPrediction(prediction.id);
    }
    if (prediction.status !== 'succeeded' || !prediction.output || prediction.output.length === 0) {
      return null;
    }
    const imageUrl = prediction.output[0];
    if (typeof imageUrl !== 'string' || imageUrl.length === 0) return null;
    await downloadImage(imageUrl, localPath);
    return localPath;
  } catch {
    return null;
  }
}
