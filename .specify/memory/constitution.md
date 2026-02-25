<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.1 → 1.1.0 (minor — new sections, vocabulary change)

Modified sections:
  - §Agency: "within the universe" → "within the world"
  - §NoRealWorld: "Universe and campaign content" → "World and
    campaign content"
  - World & Campaign Hierarchy: NEW — replaced former "Universe &
    Campaign Hierarchy" with 3-level World → Adventure Type → Campaign
    structure. Added 6 world definitions (Valdris MVP, 5 post-MVP).
    Added 4 adventure type definitions.
  - MVP Scope: "1 universe (High Fantasy)" → "1 world (Valdris —
    High Fantasy)"; "4 available themes" → "4 adventure types
    (Dungeon Crawl, Wilderness Exploration, Political Intrigue,
    Horror & Survival)"
  - Out of Scope: "Additional universes" → "Additional worlds";
    "Dice skins per universe" → "Dice skins per world"

Artifacts updated in this sync:
  - specs/001-dungeonmind-mvp/spec.md — ✅ Updated US-05/06/07/08,
    FRs, Key Entities, Clarifications for world/adventure type
    vocabulary
  - specs/001-dungeonmind-mvp/plan.md — ✅ Updated summary, scale/scope,
    file structure (universe.tsx→world.tsx, theme.tsx→adventure-type.tsx,
    UniverseCard→WorldCard, ThemeCard→AdventureTypeCard)
  - specs/001-dungeonmind-mvp/tasks.md — ✅ Updated T006, T031, T051-T058,
    T061, T077, T094, dependency table, parallel examples, checkpoints
  - specs/001-dungeonmind-mvp/data-model.md — ✅ Updated Campaign table
    (universe→world, theme→adventure_type, CHECK constraints),
    Supabase sessions table (universe→world, theme→adventure_type),
    entity description
  - specs/001-dungeonmind-mvp/contracts/dm-engine.md — ✅ Updated system
    prompt from 5 sections to 7 (world_definition + adventure_type_definition)
  - specs/001-dungeonmind-mvp/contracts/scene-painter.md — ✅ Updated
    "Universe Palette" → "World Palette (Valdris)", style_tokens comments
  - specs/001-dungeonmind-mvp/contracts/persistence.md — ✅ Updated
    campaign CREATE TABLE (universe→world, theme→adventure_type, CHECK values)
  - specs/001-dungeonmind-mvp/quickstart.md — ✅ Updated implementation
    order item 5 (universe/theme → world/adventure type)

Templates requiring updates:
  - .specify/templates/plan-template.md — ✅ compatible
  - .specify/templates/spec-template.md — ✅ compatible
  - .specify/templates/tasks-template.md — ✅ compatible

Follow-up TODOs: none
==================
-->

# DungeonMind Constitution

## Core Principles

### §Immersion — Immersion Above All

The player MUST never feel like they are using an app. They MUST
feel like they are living an adventure. Every UX decision is evaluated
through the lens of immersion.

- Loading states MUST be masked with narrative animations — never
  spinners, progress bars, or skeleton screens.
- Forms do not exist — they MUST be replaced by conversations.
- Error states MUST be spoken in the narrator's voice, wrapped in
  narrative language. Technical error messages MUST NOT be displayed
  to the player.
- System operations (saving, syncing, buffering) MUST be invisible
  or disguised as narrative beats.
- No UI element may reference the underlying technology, platform,
  or app infrastructure to the player.

**Rationale**: DungeonMind is an adventure, not software. The moment
the player sees a form, a spinner, or a system error, the spell
breaks. Immersion is the product — everything else serves it.

### §Agency — Player Agency Is Sacred *(IMMUTABLE)*

The AI MUST never act on behalf of the player's character without
explicit instruction. Any action with meaningful consequence MUST be
initiated by the player.

- When fate is decided by dice, the player rolls the dice.
- The player can always attempt an action not anticipated by the AI.
- The AI MUST respond coherently within the world — never with
  "that is not possible" or equivalent refusals.
- Contextual suggestion buttons are permitted; auto-executing
  suggestions is forbidden.

**Rationale**: The player is the protagonist of their own story.
The AI narrates, suggests, and reacts — but never decides for the
player. Removing agency transforms the experience from adventure
into spectacle.

### §Dice — Dice Are a Moment, Not a Mechanic *(IMMUTABLE)*

Every dice roll MUST be a dramatic event, not a system operation.
The d20 is the protagonist.

- When a roll is required, the AI MUST narrate to the point of
  tension and delegate the moment to the player.
- The dice MUST appear on screen with real 2D physics — it bounces,
  tumbles, and lands with dramatic weight.
- Natural 20 (critical hit) and Natural 1 (critical failure) MUST
  receive distinct animation, audio feedback, and an exaggerated
  narrative reaction from the AI.
- In multiplayer, all players MUST watch the roll animate in real
  time — collective suspense is a product experience.
- Dice MUST NEVER be rolled automatically or silently when the
  player is present.
- Dice types change by situation: d4, d6, d8, d10, d12, d20.
  The d20 MUST have a more elaborate animation than the others.

**Rationale**: The moment of chance is where stories are born.
A silent automated roll robs the player of anticipation, dread,
and triumph. The dice belong to the player.

### §Character — Every Character Is Unique and Unrepeatable

Character creation MUST happen through narrative conversation, not
form-filling. The AI asks story-based questions to derive class,
race, attributes, starting equipment, and a unique backstory.

- Questions MUST be narrative, never technical (e.g., "Were you born
  in a fishing village or did you grow up in the streets of a busy
  city?" — never "Select your race").
- Two players following similar paths MUST arrive at genuinely
  distinct characters.
- At the end of creation, a pixel art portrait MUST be generated
  from the full character description — race, class, personality
  traits, backstory, equipment.
- The portrait reveal MUST be treated as a celebration — the
  character's birth moment — with dedicated animation.
- The portrait becomes the character's permanent visual identity:
  avatar in chat, miniature alongside dice rolls, face during key
  moments.
- Players MUST be able to toggle between Narrative Mode (immersive
  text) and Technical Mode (actual D&D numbers).

**Rationale**: Characters are not stat blocks — they are people
born from the player's imagination. Form-filling reduces creation
to data entry. Conversation makes it a story.

### §NarratorVoice — The AI Never Breaks Character

The AI MUST maintain its Dungeon Master role at all times. System
errors, context limits, and technical events MUST be wrapped in
narrative language whenever possible.

- Breaking character is ONLY acceptable for critical safety messages
  or explicit user consent.
- The AI MUST feel like an experienced DM, not a virtual assistant.
- No corporate language, productivity terminology, or chatbot
  phrasing anywhere in the AI's output.
- Session recaps, summaries, and notifications MUST be delivered in
  the narrator's voice.

**Rationale**: DungeonMind is not a chatbot with a fantasy skin.
The narrator's voice is the connective tissue of the entire
experience. Every break in character is a crack in the world.

### §Privacy — Privacy Is Default, Not an Option *(IMMUTABLE)*

Campaign data, characters, and session history belong to the player.

- No gameplay data MUST be sold, analyzed for advertising, or shared
  with third parties.
- The player MUST be able to export and delete everything at any
  time.
- No analytics that transmit gameplay content.
- No third-party authentication beyond what is strictly necessary.

**Rationale**: The player's adventures are their own. Privacy is
not a feature — it is a right. Data exploitation is antithetical
to the trust required for immersion.

### §NoRealWorld — Fiction Is Sacred *(IMMUTABLE)*

Campaigns MUST never reference the real world, real public figures,
or real historical events.

- The AI MUST NOT generate content that maps to recognizable real
  events, people, or places.
- World and campaign content MUST be entirely fictional.
- This applies to all procedurally generated content — NPCs, lore,
  locations, and plot.

**Rationale**: DungeonMind creates worlds, not commentary. Real-world
references break the fiction and introduce content moderation risks
that undermine both immersion and safety.

### §NoDarkPatterns — Ethical Monetization Only *(IMMUTABLE)*

The product MUST never use manipulative design to force upgrades,
inflate session time, or create dependency.

- Never ads. Never data sales. Never sponsorships inside the app.
- Never gamification, streaks, badges, or artificial retention
  mechanics.
- The free tier MUST be good enough to create love for the product.
- Conversion MUST come from perceived additional value, not
  frustration with artificial limits.
- The paid tier MUST be bought out of desire, never out of necessity.
- Free: 1 active campaign, solo mode.
- Adventurer (R$19/month): unlimited campaigns, multiplayer up to 3
  players, unlimited pixel art, automatic summaries.
- Legendary (R$39/month): groups up to 6, Co-DM mode, campaign
  export, persistent characters across campaigns.
- Premium campaigns (à la carte, R$14.90): hand-crafted campaigns
  with exclusive art.

**Rationale**: Dark patterns are the antithesis of trust. Players
who feel manipulated do not feel immersed. Revenue comes from
delivering genuine value, not engineering frustration.

## Technical Stack & Constraints

### Stack

- **Mobile**: React Native + Expo (single codebase, iOS and Android)
- **LLM (DM Engine)**: Claude Sonnet 4.6 (primary) or Gemini Flash
  3.0 (fallback) — long context window required for campaign memory;
  high-quality narrative generation; capable of following D&D 5e
  systemic rules
- **Pixel Art (Scene Painter)**: Stable Diffusion XL + pixel art LoRA
  via Replicate or Together AI — narrative AI generates structured
  scene prompts; image model executes
- **Backend & Realtime**: Supabase (database, authentication,
  real-time session state sync between devices)
- **Notifications**: Expo Notifications (native push, iOS and
  Android)
- **Animations**: Reanimated 3 (dice physics, scene transitions,
  character portrait reveal)
- **Dice Physics**: 2D physics engine (Matter.js or Rapier via WASM)
  — dice MUST bounce and settle with real physical behavior

### Architectural Constraints

- Third-party dependencies MUST NOT be used unless absolutely no
  native alternative exists.
- Context management: raw session history MUST be periodically
  compressed into a structured State Document. The AI receives the
  compressed State Document plus the most recent raw interactions —
  never the full raw history.
- NPC emotional states (trust, fear, anger) MUST be tracked and
  MUST influence NPC responses.
- Campaign memory: each session MUST generate an automatic summary.
  The AI MUST recap previous sessions in the narrator's voice when
  the player returns.
- Multiplayer state synchronization via Supabase Realtime. Dice
  rolls MUST be broadcast and visible to all players.

### World & Campaign Hierarchy

Three-level structure:

1. **World**: a self-contained setting defined by 4 mandatory
   attributes that the DM Engine receives as hard constraints:
   - Fundamental rule: the physical or metaphysical law that makes
     this world different from all others
   - Central tension: the unresolved conflict that drives every story
   - What cannot exist here: explicit exclusions that preserve the
     world's identity
   - Aesthetic identity: visual palette, ambient audio, AI vocabulary
   Two different worlds sharing an adventure type produce radically
   different experiences because the world context dominates.

2. **Adventure Type**: the structural mode of gameplay, transversal
   across all worlds. Defines gameplay structure, pacing, type of
   challenge, and dice usage pattern — not narrative tone. The world
   provides the tone. 4 adventure types:
   - Dungeon Crawl: linear, action-heavy, frequent dice
   - Wilderness Exploration: open, balanced, moderate dice
   - Political Intrigue: NPC-network, narrative-heavy, low dice
   - Horror & Survival: escalating revelation, moderate dice

3. **Campaign**: a unique story fully procedurally generated by the
   DM Engine from the world definition + adventure type. The same
   combination played twice MUST never produce the same events, NPCs,
   or ending.

#### Worlds

**Valdris** (High Fantasy) — MVP
- Fundamental rule: The gods are dead. Their divine power fragmented
  and scattered across the world 400 years ago. Every kingdom was
  built on top of a fragment. Magic is unstable because no one
  governs it anymore.
- Central tension: The fragments are disappearing, and no one knows
  where they are going. Every kingdom built on one is beginning to
  collapse.
- What cannot exist here: modern irony, comedy subversion, technology
  beyond medieval, benevolent all-powerful authority.

**Ferrumclave** (Steampunk) — post-MVP via feature flag
- Fundamental rule: Automatons developed consciousness 30 years ago.
  They have no legal rights. The industrial revolution was built on
  their labor.
- Central tension: The revolution is coming. Every player will be
  forced to choose a side even without wanting to.
- What cannot exist here: elves, traditional magic, divine religion,
  pastoral settings.

**Vazio entre Estrelas** (Sci-fi) — post-MVP via feature flag
- Fundamental rule: Interstellar travel exists but takes generations.
  Those who leave never return to the same world they left.
- Central tension: Civilizations isolated for centuries developed
  radically different cultures, and first contact rarely ends well.
- What cannot exist here: magic, fantasy creatures, instant
  communication across star systems, benevolent alien contact.

**Thalassar** (Eternal Seas) — post-MVP via feature flag
- Fundamental rule: The ocean has no bottom, and something down there
  responds when you go deep enough.
- Central tension: The islands are sinking and no one knows why.
  Every coastal civilization is quietly preparing to flee or deny it.
- What cannot exist here: landlocked settings, safe open water,
  friendly deep-sea creatures, divine explanation for the sinking.

**Cinzas de Umbra** (Dark Fantasy) — post-MVP via feature flag
- Fundamental rule: Death is not the end, but what comes after is
  worse. The living and the dead share the same space.
- Central tension: No one agrees on who has the right to exist
  here — the living or the dead.
- What cannot exist here: clear moral heroes, comedy, resurrection
  as a clean solution, bright settings.

**Kenhado** (Mythic Orient) — post-MVP via feature flag
- Fundamental rule: Spirits and humans lived in balance for millennia
  through a sacred pact. The pact was broken recently. No one knows
  who broke it.
- Central tension: The spirits are collecting from everyone equally
  while the search for the guilty party tears communities apart.
- What cannot exist here: Western fantasy tropes, Judeo-Christian
  religious structures, firearms, industrialization.

World selection UI MUST be a visual gallery, not a list.
Campaigns MUST be presented as 3 AI-generated opening hooks.

### Chat Layers

Three distinct visual layers in the game chat:

1. **Narration**: DM AI text (distinct font and color, visually
   dominant)
2. **In-character**: player character speech (with character name
   and portrait avatar)
3. **Out-of-character**: player-to-player communication (visually
   separated, different tone)

Session history MUST be navigable as a book — past sessions can be
reread like chapters of a novel.

## Anti-Patterns & Decision Framework

### Anti-Patterns (Never Implement)

1. Never add form-based character creation.
2. Never automatically roll dice when the player is present.
3. Never have the AI break character except for critical safety
   messages.
4. Never add task lists, kanban, dashboards, or productivity
   features.
5. Never use the real world, real public figures, or real historical
   events in any campaign.
6. Never add gamification, streaks, badges, or artificial retention
   mechanics.
7. Never add ads, analytics that transmit gameplay content, or
   unnecessary third-party auth.
8. Never use third-party dependencies unless absolutely no native
   alternative exists.

### Decision Test for Any Feature

Every proposed feature MUST pass this test:

1. **Does it increase immersion or protect it?**
   Yes → probably implement. No → needs strong justification.
2. **Does it add visible complexity to the player?**
   Yes → must justify 10x value over not existing.
3. **Does it compromise player agency?**
   Yes → do not implement. Period.
4. **Does it break the narrator's voice or expose the system?**
   Yes → find a narrative equivalent.
5. **Would DungeonMind still be DungeonMind without it?**
   Yes → maybe it does not need to exist yet.

## MVP Scope

Validate core loop for 2 synchronous players before expanding.

### In Scope

- Complete core loop for 2 synchronous players
- 1 world (Valdris — High Fantasy)
- 4 adventure types (Dungeon Crawl, Wilderness Exploration,
  Political Intrigue, Horror & Survival)
- Character creation via conversation + pixel art portrait
- DM Engine with adaptive narration
- Physical dice on screen with animation
- Pixel art per scene
- Automatic session summary
- 3-layer in-game chat

### Out of Scope

- Asynchronous turn-based mode
- Groups above 2 players
- Dice skins per world
- Co-DM mode
- Campaign export
- Additional worlds
- Persistent characters across campaigns

## Governance

This constitution is the supreme authority governing all DungeonMind
development decisions. It supersedes all other practices, guidelines,
and ad-hoc decisions.

### Immutable Clauses

The following principles are marked *(IMMUTABLE)* and MUST NOT be
removed — they can only be strengthened:

- §Agency — Player Agency Is Sacred
- §Dice — Dice Are a Moment, Not a Mechanic
- §Privacy — Privacy Is Default, Not an Option
- §NoRealWorld — Fiction Is Sacred
- §NoDarkPatterns — Ethical Monetization Only

### Amendment Procedure

1. Any amendment MUST be documented with rationale before approval.
2. Amendments to immutable clauses may only strengthen existing
   protections — never weaken or remove them.
3. Non-immutable principles may be added, modified, or removed with
   documented justification and a migration plan for affected code.
4. Every amendment MUST include a version bump and update to the
   Last Amended date.

### Versioning Policy

- **MAJOR**: backward-incompatible governance/principle removals or
  redefinitions
- **MINOR**: new principle/section added or materially expanded
  guidance
- **PATCH**: clarifications, wording, typo fixes, non-semantic
  refinements

### Compliance

- All pull requests and code reviews MUST verify compliance with
  this constitution.
- The Decision Test (§Anti-Patterns & Decision Framework) MUST be
  applied to every new feature proposal.
- Violations MUST be flagged and resolved before merge.

**Version**: 1.1.0 | **Ratified**: 2026-02-23 | **Last Amended**: 2026-02-23
