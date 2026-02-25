import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Player, Difficulty, SubscriptionTier } from '../types/entities';
import { generateId, nowISO } from '../persistence/database';

interface SettingsState {
  player: Player | null;
  isLoaded: boolean;

  hydrate(db: SQLiteDatabase): void;
  updateDisplayName(db: SQLiteDatabase, name: string): void;
  updateDifficulty(db: SQLiteDatabase, difficulty: Difficulty): void;
  updateMatureContent(db: SQLiteDatabase, enabled: boolean): void;
  updateNotificationPreferences(
    db: SQLiteDatabase,
    prefs: Record<string, boolean>
  ): void;
  getPlayerId(): string | null;
}

function mapPlayerRow(row: Record<string, unknown>): Player {
  return {
    id: row['id'] as string,
    display_name: row['display_name'] as string,
    subscription_tier: row['subscription_tier'] as SubscriptionTier,
    mature_content_enabled: (row['mature_content_enabled'] as number) === 1,
    difficulty_preference: row['difficulty_preference'] as Difficulty,
    notification_preferences: JSON.parse(
      (row['notification_preferences'] as string) || '{}'
    ) as Record<string, boolean>,
    created_at: row['created_at'] as string,
    updated_at: row['updated_at'] as string,
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  player: null,
  isLoaded: false,

  hydrate(db: SQLiteDatabase) {
    const row = db.getFirstSync<Record<string, unknown>>(
      'SELECT * FROM player LIMIT 1'
    );

    if (row) {
      set({ player: mapPlayerRow(row), isLoaded: true });
    } else {
      const now = nowISO();
      const id = generateId();
      db.runSync(
        `INSERT INTO player (id, display_name, subscription_tier, mature_content_enabled, difficulty_preference, notification_preferences, created_at, updated_at)
         VALUES (?, ?, 'free', 0, 'standard', '{}', ?, ?)`,
        [id, 'Aventureiro', now, now]
      );
      const player: Player = {
        id,
        display_name: 'Aventureiro',
        subscription_tier: 'free',
        mature_content_enabled: false,
        difficulty_preference: 'standard',
        notification_preferences: {},
        created_at: now,
        updated_at: now,
      };
      set({ player, isLoaded: true });
    }
  },

  updateDisplayName(db: SQLiteDatabase, name: string) {
    const { player } = get();
    if (!player) return;
    const now = nowISO();
    db.runSync(
      'UPDATE player SET display_name = ?, updated_at = ? WHERE id = ?',
      [name, now, player.id]
    );
    set({ player: { ...player, display_name: name, updated_at: now } });
  },

  updateDifficulty(db: SQLiteDatabase, difficulty: Difficulty) {
    const { player } = get();
    if (!player) return;
    const now = nowISO();
    db.runSync(
      'UPDATE player SET difficulty_preference = ?, updated_at = ? WHERE id = ?',
      [difficulty, now, player.id]
    );
    set({
      player: { ...player, difficulty_preference: difficulty, updated_at: now },
    });
  },

  updateMatureContent(db: SQLiteDatabase, enabled: boolean) {
    const { player } = get();
    if (!player) return;
    const now = nowISO();
    db.runSync(
      'UPDATE player SET mature_content_enabled = ?, updated_at = ? WHERE id = ?',
      [enabled ? 1 : 0, now, player.id]
    );
    set({
      player: { ...player, mature_content_enabled: enabled, updated_at: now },
    });
  },

  updateNotificationPreferences(
    db: SQLiteDatabase,
    prefs: Record<string, boolean>
  ) {
    const { player } = get();
    if (!player) return;
    const now = nowISO();
    const merged = { ...player.notification_preferences, ...prefs };
    db.runSync(
      'UPDATE player SET notification_preferences = ?, updated_at = ? WHERE id = ?',
      [JSON.stringify(merged), now, player.id]
    );
    set({
      player: { ...player, notification_preferences: merged, updated_at: now },
    });
  },

  getPlayerId() {
    return get().player?.id ?? null;
  },
}));
