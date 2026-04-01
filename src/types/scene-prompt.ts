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

export const ASHENMOOR_STYLE_TOKENS = [
  'ashenmoor_palette',
  'gothic_architecture',
  'candlelight_and_fog',
  'muted_grays',
  'blood_red_accents',
  'decayed_grandeur',
  'horror_atmosphere',
  'moonlit_moors',
];

export const PORTRAIT_STYLE_TOKENS = [
  'pixel_art_portrait',
  'front_facing',
  'bust_shot',
  'valdris_aesthetic',
];

export const ASHENMOOR_PORTRAIT_STYLE_TOKENS = [
  'pixel_art_portrait',
  'front_facing',
  'bust_shot',
  'ashenmoor_aesthetic',
  'pale_skin_tones',
  'dark_shadows',
];

export const IMAGE_CONFIG = {
  width: 768,
  height: 1344,
  scheduler: 'K_EULER' as const,
  num_inference_steps: 25,
  guidance_scale: 7.5,
  num_outputs: 1,
};

export const PORTRAIT_IMAGE_CONFIG = {
  width: 512,
  height: 512,
  scheduler: 'K_EULER' as const,
  num_inference_steps: 25,
  guidance_scale: 7.5,
  num_outputs: 1,
};
