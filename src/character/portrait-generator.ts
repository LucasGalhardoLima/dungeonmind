// Character portrait generator using Replicate API (SDXL + pixel-art-xl LoRA)

import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import type { PortraitPrompt } from '../types/scene-prompt';
import { IMAGE_CONFIG, PORTRAIT_STYLE_TOKENS, DEFAULT_NEGATIVE_PROMPT } from '../types/scene-prompt';

const REPLICATE_API_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_REPLICATE_API_KEY ??
  process.env['EXPO_PUBLIC_REPLICATE_API_KEY'] ??
  '';

const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';
const POLL_INTERVAL_MS = 1000;
const TIMEOUT_MS = 15000;
const PORTRAITS_DIR = `${FileSystem.documentDirectory}portraits/`;

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

export function buildPortraitTextPrompt(prompt: PortraitPrompt): string {
  const styleString = [...PORTRAIT_STYLE_TOKENS, ...prompt.style_tokens].join(', ');
  return [
    'pixel art portrait',
    'front facing',
    'bust shot',
    prompt.physical_description,
    prompt.equipment,
    prompt.expression,
    styleString,
  ].join(', ');
}

function generateFilename(prompt: PortraitPrompt): string {
  return `portrait_${String(prompt.seed)}.png`;
}

async function ensurePortraitsDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(PORTRAITS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PORTRAITS_DIR, { intermediates: true });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function createPrediction(textPrompt: string, seed: number): Promise<ReplicatePrediction> {
  const response = await fetch(REPLICATE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REPLICATE_API_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'wait',
    },
    body: JSON.stringify({
      version: 'nerijs/pixel-art-xl',
      input: {
        prompt: textPrompt,
        negative_prompt: DEFAULT_NEGATIVE_PROMPT,
        width: IMAGE_CONFIG.width,
        height: IMAGE_CONFIG.height,
        scheduler: IMAGE_CONFIG.scheduler,
        num_inference_steps: IMAGE_CONFIG.num_inference_steps,
        guidance_scale: IMAGE_CONFIG.guidance_scale,
        num_outputs: IMAGE_CONFIG.num_outputs,
        seed,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Replicate API returned ${String(response.status)}`);
  }

  const body: unknown = await response.json();
  if (!isReplicatePrediction(body)) {
    throw new Error('Invalid prediction response from Replicate API');
  }

  return body;
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

  throw new Error('Portrait generation timed out');
}

async function downloadImage(remoteUrl: string, localPath: string): Promise<void> {
  const downloadResult = await FileSystem.downloadAsync(remoteUrl, localPath);

  if (downloadResult.status !== 200) {
    throw new Error(`Image download failed with status ${String(downloadResult.status)}`);
  }
}

async function attemptGeneration(prompt: PortraitPrompt): Promise<string> {
  const textPrompt = buildPortraitTextPrompt(prompt);
  const filename = generateFilename(prompt);
  const localPath = `${PORTRAITS_DIR}${filename}`;

  // Check if portrait already exists for this seed
  const fileInfo = await FileSystem.getInfoAsync(localPath);
  if (fileInfo.exists) {
    return localPath;
  }

  await ensurePortraitsDir();

  // Create prediction
  let prediction = await createPrediction(textPrompt, prompt.seed);

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

export async function generatePortrait(prompt: PortraitPrompt): Promise<string | null> {
  // First attempt
  try {
    return await attemptGeneration(prompt);
  } catch (_firstError: unknown) {
    // Single background retry on failure before giving up
  }

  // Retry once
  try {
    return await attemptGeneration(prompt);
  } catch (_retryError: unknown) {
    // Return null — the UI will show a narrative fallback
    return null;
  }
}
