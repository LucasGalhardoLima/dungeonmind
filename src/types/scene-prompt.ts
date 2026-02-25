// Scene and portrait prompt types per contracts/scene-painter.md

export type SceneTone =
  | 'tense'
  | 'triumphant'
  | 'ominous'
  | 'peaceful'
  | 'chaotic'
  | 'comedic';

export interface ScenePrompt {
  setting: string;
  characters: string[];
  tone: SceneTone;
  style_tokens: string[];
  negative_prompt: string;
}

export interface PortraitPrompt {
  physical_description: string;
  equipment: string;
  expression: string;
  style_tokens: string[];
  seed: number;
}

export const DEFAULT_NEGATIVE_PROMPT =
  'modern elements, text, watermark, photorealistic, 3d render, blurry';

export const VALDRIS_STYLE_TOKENS = [
  'valdris_palette',
  'medieval_architecture',
  'torch_lighting',
  'high_fantasy_palette',
];

export const PORTRAIT_STYLE_TOKENS = [
  'pixel_art_portrait',
  'front_facing',
  'bust_shot',
  'valdris_aesthetic',
];

export const IMAGE_CONFIG = {
  width: 512,
  height: 512,
  scheduler: 'K_EULER' as const,
  num_inference_steps: 25,
  guidance_scale: 7.5,
  num_outputs: 1,
};
