import type { DiceType } from '../types/dice';
import { DICE_FACES } from '../types/dice';

/**
 * Determines the dice result based on the physics body's angle.
 * Maps the final angle to a face number using angular sectors.
 *
 * For 2D physics, we project the 3D face-normal concept onto the
 * body's rotation angle: divide 2π by the number of faces, and
 * determine which sector the current angle falls into.
 */
export function calculateResult(angle: number, diceType: DiceType): number {
  const faces = DICE_FACES[diceType];

  // Normalize angle to [0, 2π)
  const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  // Divide the full rotation into equal sectors
  const sectorAngle = (Math.PI * 2) / faces;

  // Determine which sector the angle falls into (0-indexed)
  const sector = Math.floor(normalized / sectorAngle);

  // Map sector to face number (1-indexed)
  // Use a deterministic mapping based on dice type
  const faceOrder = getFaceOrder(diceType);
  return faceOrder[sector % faceOrder.length] ?? 1;
}

function getFaceOrder(diceType: DiceType): number[] {
  switch (diceType) {
    case 'd4':
      return [1, 3, 2, 4];
    case 'd6':
      return [1, 6, 2, 5, 3, 4];
    case 'd8':
      return [1, 8, 3, 6, 2, 7, 4, 5];
    case 'd10':
      return [1, 10, 3, 8, 5, 6, 2, 9, 4, 7];
    case 'd12':
      return [1, 12, 3, 10, 5, 8, 7, 6, 9, 4, 11, 2];
    case 'd20':
      return [
        1, 20, 3, 18, 5, 16, 7, 14, 9, 12,
        11, 10, 13, 8, 15, 6, 17, 4, 19, 2,
      ];
  }
}

export function isCriticalHit(result: number, diceType: DiceType): boolean {
  return diceType === 'd20' && result === 20;
}

export function isCriticalFail(result: number, diceType: DiceType): boolean {
  return diceType === 'd20' && result === 1;
}
