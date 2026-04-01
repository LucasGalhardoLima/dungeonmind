// Combat system types for initiative tracking, combat log, and multi-round flow

export interface CombatParticipant {
  id: string;
  name: string;
  initiative: number;
  isPlayer: boolean;
  isActive: boolean; // currently taking their turn
  hpCurrent?: number;
  hpMax?: number;
  conditions: string[];
}

export type CombatLogEntryType =
  | 'combat_start'
  | 'combat_end'
  | 'round_start'
  | 'attack'
  | 'damage'
  | 'heal'
  | 'spell'
  | 'save'
  | 'death_save'
  | 'ability'
  | 'movement'
  | 'status';

export interface CombatLogEntry {
  id: string;
  round: number;
  type: CombatLogEntryType;
  actor: string;
  description: string;
  timestamp: string;
  details?: {
    target?: string;
    value?: number;
    diceResult?: number;
    damageType?: string;
    spellName?: string;
    success?: boolean;
  };
}

export interface CombatState {
  inCombat: boolean;
  round: number;
  participants: CombatParticipant[];
  currentTurnIndex: number;
  log: CombatLogEntry[];
}
