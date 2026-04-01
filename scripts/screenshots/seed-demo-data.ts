/**
 * Seed demo data for App Store screenshots.
 *
 * Usage: npx tsx scripts/screenshots/seed-demo-data.ts
 *
 * This script populates the app's SQLite database with compelling
 * demo content suitable for screenshots. It should be run AFTER
 * the app has been launched once (to create the database).
 *
 * The data creates a Valdris dungeon_crawl campaign with a level 5
 * Fighter named "Kael Stormforge" that has rich exchanges, quest
 * entries, and an active session with narrative content.
 */

import { getDatabase } from '../../src/persistence/database';
import { v4 as uuid } from 'uuid';

const db = getDatabase();

const PLAYER_ID = 'screenshot-player';
const CAMPAIGN_ID = 'screenshot-campaign';
const CHARACTER_ID = 'screenshot-character';
const SESSION_ID = 'screenshot-session';

// ---- Player ----
db.runSync(`
  INSERT OR REPLACE INTO player (id, display_name, subscription_tier, difficulty_preference, mature_content_enabled, notification_preferences, onboarding_completed)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`, [PLAYER_ID, 'Adventurer', 'free', 'standard', 0, '{}', 1]);

// ---- Campaign ----
const stateDocument = JSON.stringify({
  active_characters: [{
    name: 'Kael Stormforge',
    class: 'Fighter',
    race: 'Human',
    level: 5,
    hp: { current: 42, max: 44 },
    inventory: [
      { name: 'Flametongue Longsword', quantity: 1 },
      { name: 'Shield of the Sentinel', quantity: 1 },
      { name: 'Chain Mail +1', quantity: 1 },
      { name: 'Potion of Healing', quantity: 3 },
      { name: 'Rope (50 ft)', quantity: 1 },
    ],
    backstory_summary: 'Former captain of the Silver Guard, seeking the Fragment of Solaris.',
    armor_class: 19,
    gold: 127,
    class_abilities: [
      { name: 'Second Wind', resource_name: 'uses', resource_max: 1, resource_current: 1 },
      { name: 'Action Surge', resource_name: 'uses', resource_max: 1, resource_current: 0 },
      { name: 'Extra Attack', resource_name: 'uses', resource_max: 0, resource_current: 0 },
    ],
    spell_slots_remaining: null,
    death_saves: { successes: 0, failures: 0 },
  }],
  session_events: [
    { turn: 1, summary: 'Entered the Sunken Cathedral through the collapsed eastern nave.' },
    { turn: 3, summary: 'Defeated two shadow sentinels guarding the inner sanctum.' },
    { turn: 5, summary: 'Discovered the Fragment of Solaris behind a sealed door.' },
  ],
  npc_registry: [
    { name: 'Elara Moonshadow', relationship: 'ally', last_interaction: 'Provided the map to the cathedral.' },
    { name: 'Thane Blackiron', relationship: 'rival', last_interaction: 'Challenged Kael for the fragment.' },
  ],
  active_quests: [
    { title: 'The Fragment of Solaris', status: 'active', description: 'Retrieve the divine fragment from the Sunken Cathedral before Thane Blackiron claims it.', location: 'Sunken Cathedral' },
    { title: 'The Silver Guard\'s Honor', status: 'active', description: 'Clear the name of the disbanded Silver Guard by uncovering the truth behind the Night of Falling Stars.', location: 'Valdris' },
  ],
  world_state: {
    location: 'Sunken Cathedral — Inner Sanctum',
    time_of_day: 'night',
    weather: 'underground',
    active_threats: ['Thane Blackiron approaches', 'Cathedral structural collapse imminent'],
  },
  narrative_arc: {
    theme: 'redemption',
    tension_level: 8,
    major_arc_beats: ['Fragment discovered', 'Rival approaching'],
  },
});

db.runSync(`
  INSERT OR REPLACE INTO campaign (id, player_id, session_code, world, adventure_type, name, opening_hook, state_document, status, difficulty, mature_content, session_count, created_at, last_played_at, thumbnail_path)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, [
  CAMPAIGN_ID, PLAYER_ID, null, 'valdris', 'dungeon_crawl',
  'The Sunken Cathedral',
  'The last fragment of divine power lies beneath the flooded ruins of the Cathedral of Solaris. You are not the only one searching.',
  stateDocument, 'active', 'standard', 0, 3,
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  new Date().toISOString(),
  null,
]);

// ---- Character ----
db.runSync(`
  INSERT OR REPLACE INTO character (id, campaign_id, player_id, name, class, race, level, hp_current, hp_max, stats, inventory, saving_throws, skills, portrait_path, portrait_prompt, portrait_seed, backstory, backstory_summary, narrative_description, xp, armor_class, gold, hit_dice_total, hit_dice_spent, class_abilities, spell_slots, cantrips, known_spells, concentrating_on, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, [
  CHARACTER_ID, CAMPAIGN_ID, PLAYER_ID,
  'Kael Stormforge', 'Fighter', 'Human', 5,
  42, 44,
  JSON.stringify({ str: 18, dex: 14, con: 16, int: 10, wis: 12, cha: 13 }),
  JSON.stringify([
    { name: 'Flametongue Longsword', quantity: 1 },
    { name: 'Shield of the Sentinel', quantity: 1 },
    { name: 'Chain Mail +1', quantity: 1 },
    { name: 'Potion of Healing', quantity: 3 },
    { name: 'Rope (50 ft)', quantity: 1 },
    { name: 'Adventurer\'s Kit', quantity: 1 },
  ]),
  JSON.stringify({ str: 7, con: 6 }),
  JSON.stringify({ athletics: 7, perception: 4, intimidation: 4 }),
  null,
  'A battle-scarred human fighter with a flaming longsword',
  42,
  'Kael Stormforge served as captain of the Silver Guard until the Night of Falling Stars, when the gods died and divine fragments rained across Valdris. Falsely accused of abandoning his post, he now seeks the fragments to restore order and clear his name.',
  'Former Silver Guard captain. Seeks divine fragments to restore honor.',
  'A tall, broad-shouldered human with silver-streaked dark hair and a jagged scar across his left cheek. His eyes carry the weight of command.',
  6500, 19, 127, 5, 1,
  JSON.stringify([
    { name: 'Second Wind', description: 'Regain 1d10+5 HP as a bonus action', resource_name: 'uses', resource_max: 1, resource_current: 1 },
    { name: 'Action Surge', description: 'Take an additional action on your turn', resource_name: 'uses', resource_max: 1, resource_current: 0 },
    { name: 'Extra Attack', description: 'Attack twice when you take the Attack action', resource_name: 'uses', resource_max: 0, resource_current: 0 },
  ]),
  null, '[]', '[]', null,
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
]);

// ---- Session ----
db.runSync(`
  INSERT OR REPLACE INTO session (id, campaign_id, summary, summary_generated_at, started_at, ended_at, is_multiplayer)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`, [
  SESSION_ID, CAMPAIGN_ID,
  null, null,
  new Date().toISOString(), null, 0,
]);

// ---- Exchanges (narrative content for Session Play screenshot) ----
const exchanges = [
  {
    role: 'dm',
    content: 'The Sunken Cathedral looms before you, its once-magnificent spires now half-submerged in dark water. Moonlight filters through shattered stained glass, casting fractured patterns across the flooded nave. The air smells of ancient stone and something older — divine residue. Somewhere deep within, you can feel it: the Fragment of Solaris, pulsing like a second heartbeat.',
    sequence: 0,
  },
  {
    role: 'player',
    content: 'I draw my sword and move cautiously through the eastern entrance, scanning for traps.',
    sequence: 1,
  },
  {
    role: 'dm',
    content: 'Your Flametongue ignites, casting dancing orange light across the waterlogged stone. The eastern nave\'s ceiling has collapsed, creating a natural ramp of rubble descending into the cathedral\'s depths. As you step forward, your trained eye catches thin wires stretched across the passage — a tripwire connected to a mechanism hidden in the wall. Someone was here before you.',
    sequence: 2,
  },
  {
    role: 'player',
    content: 'I carefully disarm the trap and proceed deeper into the cathedral.',
    sequence: 3,
  },
  {
    role: 'dm',
    content: 'With steady hands, you sever the wire. A soft click echoes through the hall — harmless now. Beyond the trap, the passage opens into the inner sanctum. Two shadow sentinels materialize from the darkness, their forms flickering like candle flames in a storm. Ancient guardians, still bound to protect what lies within. They raise obsidian blades and advance.',
    sequence: 4,
  },
];

for (const exchange of exchanges) {
  db.runSync(`
    INSERT INTO exchange (id, session_id, campaign_id, role, content, metadata, sequence, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    uuid(), SESSION_ID, CAMPAIGN_ID,
    exchange.role, exchange.content, null, exchange.sequence,
    new Date(Date.now() - (exchanges.length - exchange.sequence) * 60000).toISOString(),
  ]);
}

// ---- Quest Log ----
db.runSync(`
  INSERT OR REPLACE INTO quest_log (id, campaign_id, session_id, title, description, status, location, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`, [
  uuid(), CAMPAIGN_ID, SESSION_ID,
  'The Fragment of Solaris',
  'Retrieve the divine fragment from the Sunken Cathedral before Thane Blackiron claims it. The fragment is the last piece needed to restore the divine barrier.',
  'active', 'Sunken Cathedral',
  new Date().toISOString(), new Date().toISOString(),
]);

db.runSync(`
  INSERT OR REPLACE INTO quest_log (id, campaign_id, session_id, title, description, status, location, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`, [
  uuid(), CAMPAIGN_ID, SESSION_ID,
  "The Silver Guard's Honor",
  'Clear the name of the disbanded Silver Guard by uncovering the truth behind the Night of Falling Stars.',
  'active', 'Valdris',
  new Date().toISOString(), new Date().toISOString(),
]);

db.runSync(`
  INSERT OR REPLACE INTO quest_log (id, campaign_id, session_id, title, description, status, location, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`, [
  uuid(), CAMPAIGN_ID, SESSION_ID,
  "Elara's Map",
  'Locate the elven cartographer Elara Moonshadow and obtain the map to the Sunken Cathedral.',
  'completed', 'Thornwall Tavern',
  new Date().toISOString(), new Date().toISOString(),
]);

// ---- NPCs ----
db.runSync(`
  INSERT OR REPLACE INTO npc (id, campaign_id, name, description, trust, fear, anger, gratitude, last_interaction_summary, last_interaction_session_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, [
  uuid(), CAMPAIGN_ID,
  'Elara Moonshadow', 'An elven cartographer and scholar who studies the divine fragments.',
  75, 0, 0, 60,
  'Provided the map to the Sunken Cathedral in exchange for protection.',
  SESSION_ID, new Date().toISOString(), new Date().toISOString(),
]);

db.runSync(`
  INSERT OR REPLACE INTO npc (id, campaign_id, name, description, trust, fear, anger, gratitude, last_interaction_summary, last_interaction_session_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, [
  uuid(), CAMPAIGN_ID,
  'Thane Blackiron', 'A ruthless mercenary commander who seeks divine fragments for power.',
  10, 30, 50, 0,
  'Challenged Kael at the Crossroads tavern, vowing to reach the fragment first.',
  SESSION_ID, new Date().toISOString(), new Date().toISOString(),
]);

console.log('Demo data seeded successfully for App Store screenshots.');
console.log(`Campaign: ${CAMPAIGN_ID}`);
console.log(`Character: Kael Stormforge (Level 5 Fighter)`);
console.log(`Session: ${SESSION_ID} with ${exchanges.length} exchanges`);
