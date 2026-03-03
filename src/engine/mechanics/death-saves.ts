import type { Difficulty } from '../../types/entities';

export interface DeathSaveState {
  active: boolean;
  successes: number;
  failures: number;
}

export type DeathSaveOutcome =
  | 'success'
  | 'failure'
  | 'double_failure'
  | 'revive'
  | 'stabilized'
  | 'dead';

export const EMPTY_DEATH_SAVES: DeathSaveState = {
  active: false,
  successes: 0,
  failures: 0,
};

/**
 * Activate death saves when HP reaches 0.
 */
export function activateDeathSaves(): DeathSaveState {
  return { active: true, successes: 0, failures: 0 };
}

/**
 * Process a death save roll result.
 */
export function processDeathSave(
  state: DeathSaveState,
  roll: number,
  difficulty: Difficulty,
): { newState: DeathSaveState; outcome: DeathSaveOutcome } {
  if (!state.active) return { newState: state, outcome: 'success' };

  const failuresForDeath = difficulty === 'beginner' ? 4 : 3;

  // Natural 20: revive at 1 HP
  if (roll === 20) {
    return {
      newState: { active: false, successes: 0, failures: 0 },
      outcome: 'revive',
    };
  }

  // Natural 1: 2 failures (1 in beginner)
  if (roll === 1) {
    const failuresToAdd = difficulty === 'beginner' ? 1 : 2;
    const newFailures = state.failures + failuresToAdd;
    if (newFailures >= failuresForDeath) {
      return {
        newState: { active: false, successes: state.successes, failures: newFailures },
        outcome: 'dead',
      };
    }
    return {
      newState: { active: true, successes: state.successes, failures: newFailures },
      outcome: 'double_failure',
    };
  }

  // 10+: success
  if (roll >= 10) {
    const newSuccesses = state.successes + 1;
    if (newSuccesses >= 3) {
      return {
        newState: { active: false, successes: newSuccesses, failures: state.failures },
        outcome: 'stabilized',
      };
    }
    return {
      newState: { active: true, successes: newSuccesses, failures: state.failures },
      outcome: 'success',
    };
  }

  // 2-9: failure
  const newFailures = state.failures + 1;
  if (newFailures >= failuresForDeath) {
    return {
      newState: { active: false, successes: state.successes, failures: newFailures },
      outcome: 'dead',
    };
  }
  return {
    newState: { active: true, successes: state.successes, failures: newFailures },
    outcome: 'failure',
  };
}
