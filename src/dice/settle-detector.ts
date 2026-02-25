import type { DiceBody, DiceEngine } from './dice-engine';

const SETTLE_THRESHOLD = 0.1; // rad/s
const SETTLE_FRAMES = 30; // ~500ms at 60fps
const MAX_SETTLE_WAIT_MS = 5000;
const MAX_NUDGE_ATTEMPTS = 2;

export interface SettleResult {
  settled: boolean;
  nudged: boolean;
}

export class SettleDetector {
  private consecutiveFrames = 0;
  private startTime = 0;
  private nudgeAttempts = 0;

  constructor(private engine: DiceEngine) {}

  reset(): void {
    this.consecutiveFrames = 0;
    this.startTime = Date.now();
    this.nudgeAttempts = 0;
  }

  check(diceBody: DiceBody): SettleResult {
    const angularVelocity = this.engine.getAngularVelocity(diceBody);
    const elapsed = Date.now() - this.startTime;

    if (angularVelocity < SETTLE_THRESHOLD) {
      this.consecutiveFrames++;
    } else {
      this.consecutiveFrames = 0;
    }

    if (this.consecutiveFrames >= SETTLE_FRAMES) {
      return { settled: true, nudged: false };
    }

    // Edge case: dice stuck or balanced
    if (elapsed > MAX_SETTLE_WAIT_MS && this.nudgeAttempts < MAX_NUDGE_ATTEMPTS) {
      this.engine.nudge(diceBody);
      this.nudgeAttempts++;
      this.consecutiveFrames = 0;
      return { settled: false, nudged: true };
    }

    // Force settle after too many nudge attempts
    if (this.nudgeAttempts >= MAX_NUDGE_ATTEMPTS && elapsed > MAX_SETTLE_WAIT_MS + 2000) {
      return { settled: true, nudged: false };
    }

    return { settled: false, nudged: false };
  }
}
