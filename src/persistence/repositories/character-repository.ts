import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Character,
  CharacterStats,
  ClassAbility,
  InventoryItem,
  SpellSlots,
} from '../../types/entities';
import { generateId, nowISO } from '../database';

export class CharacterRepository {
  constructor(private db: SQLiteDatabase) {}

  create(character: Omit<Character, 'id' | 'created_at'>): Character {
    const id = generateId();
    const now = nowISO();
    this.db.runSync(
      `INSERT INTO character (id, campaign_id, player_id, name, class, race, level, hp_current, hp_max, stats, inventory, saving_throws, skills, portrait_path, portrait_prompt, portrait_seed, backstory, backstory_summary, narrative_description, xp, armor_class, gold, hit_dice_total, hit_dice_spent, class_abilities, spell_slots, cantrips, known_spells, concentrating_on, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        character.campaign_id,
        character.player_id,
        character.name,
        character.class,
        character.race,
        character.level,
        character.hp_current,
        character.hp_max,
        JSON.stringify(character.stats),
        JSON.stringify(character.inventory),
        JSON.stringify(character.saving_throws),
        JSON.stringify(character.skills),
        character.portrait_path,
        character.portrait_prompt,
        character.portrait_seed,
        character.backstory,
        character.backstory_summary,
        character.narrative_description,
        character.xp,
        character.armor_class,
        character.gold,
        character.hit_dice_total,
        character.hit_dice_spent,
        JSON.stringify(character.class_abilities),
        character.spell_slots ? JSON.stringify(character.spell_slots) : null,
        JSON.stringify(character.cantrips),
        JSON.stringify(character.known_spells),
        character.concentrating_on,
        now,
      ]
    );
    return { ...character, id, created_at: now };
  }

  getById(id: string): Character | null {
    const row = this.db.getFirstSync<Record<string, unknown>>(
      'SELECT * FROM character WHERE id = ?',
      [id]
    );
    return row ? this.mapRow(row) : null;
  }

  getByCampaignId(campaignId: string): Character[] {
    const rows = this.db.getAllSync<Record<string, unknown>>(
      'SELECT * FROM character WHERE campaign_id = ? ORDER BY created_at ASC',
      [campaignId]
    );
    return rows.map((r) => this.mapRow(r));
  }

  updateStats(id: string, stats: CharacterStats): void {
    this.db.runSync('UPDATE character SET stats = ? WHERE id = ?', [
      JSON.stringify(stats),
      id,
    ]);
  }

  updateInventory(id: string, inventory: InventoryItem[]): void {
    this.db.runSync('UPDATE character SET inventory = ? WHERE id = ?', [
      JSON.stringify(inventory),
      id,
    ]);
  }

  updateHP(id: string, current: number, max: number): void {
    this.db.runSync(
      'UPDATE character SET hp_current = ?, hp_max = ? WHERE id = ?',
      [current, max, id]
    );
  }

  addXP(id: string, amount: number): void {
    this.db.runSync('UPDATE character SET xp = xp + ? WHERE id = ?', [
      amount,
      id,
    ]);
  }

  levelUp(id: string, newLevel: number, newStats: CharacterStats): void {
    this.db.runSync(
      'UPDATE character SET level = ?, stats = ? WHERE id = ?',
      [newLevel, JSON.stringify(newStats), id]
    );
  }

  updatePortrait(id: string, portraitPath: string): void {
    this.db.runSync('UPDATE character SET portrait_path = ? WHERE id = ?', [
      portraitPath,
      id,
    ]);
  }

  delete(id: string): void {
    this.db.runSync('DELETE FROM character WHERE id = ?', [id]);
  }

  private mapRow(row: Record<string, unknown>): Character {
    const spellSlotsRaw = row['spell_slots'] as string | null;
    return {
      id: row['id'] as string,
      campaign_id: row['campaign_id'] as string,
      player_id: row['player_id'] as string,
      name: row['name'] as string,
      class: row['class'] as string,
      race: row['race'] as string,
      level: row['level'] as number,
      hp_current: row['hp_current'] as number,
      hp_max: row['hp_max'] as number,
      stats: JSON.parse(row['stats'] as string) as CharacterStats,
      inventory: JSON.parse(row['inventory'] as string) as InventoryItem[],
      saving_throws: JSON.parse(row['saving_throws'] as string) as Record<
        string,
        number
      >,
      skills: JSON.parse(row['skills'] as string) as Record<string, number>,
      portrait_path: row['portrait_path'] as string | null,
      portrait_prompt: row['portrait_prompt'] as string,
      portrait_seed: row['portrait_seed'] as number,
      backstory: row['backstory'] as string,
      backstory_summary: row['backstory_summary'] as string,
      narrative_description: row['narrative_description'] as string,
      xp: row['xp'] as number,
      armor_class: row['armor_class'] as number,
      gold: row['gold'] as number,
      hit_dice_total: row['hit_dice_total'] as number,
      hit_dice_spent: row['hit_dice_spent'] as number,
      class_abilities: JSON.parse(row['class_abilities'] as string) as ClassAbility[],
      spell_slots: spellSlotsRaw ? JSON.parse(spellSlotsRaw) as SpellSlots : null,
      cantrips: JSON.parse(row['cantrips'] as string) as string[],
      known_spells: JSON.parse(row['known_spells'] as string) as string[],
      concentrating_on: row['concentrating_on'] as string | null,
      created_at: row['created_at'] as string,
    };
  }
}
