// Dice types per contracts/dice-engine.md

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

export interface DiceRequest {
  dice_type: DiceType;
  context: string;
  skill?: string;
  requesting_player: string;
}

export interface DicePhysicsConfig {
  restitution: number;
  friction: number;
  angularDamping: number;
  gravity: { x: number; y: number };
}

export const DICE_FACES: Record<DiceType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
};

export const DEFAULT_PHYSICS: DicePhysicsConfig = {
  restitution: 0.45,
  friction: 0.3,
  angularDamping: 0.8,
  gravity: { x: 0, y: 1 },
};

export const D20_PHYSICS: DicePhysicsConfig = {
  ...DEFAULT_PHYSICS,
  angularDamping: 0.75,
};
