# Feature Specification: DungeonMind MVP

**Feature Branch**: `001-dungeonmind-mvp`
**Created**: 2026-02-23
**Status**: Draft
**Input**: Full MVP specification for DungeonMind — AI-powered D&D Dungeon Master mobile app

## Problem Statement

Playing D&D requires one person to sacrifice their player role to become the Dungeon Master, creating a permanent barrier for solo players, groups without an available DM, and friends separated by distance. DungeonMind eliminates that barrier: the AI is the DM.

**Target Users**:
- D&D fans who want to play without needing a human DM
- Solo players who want to explore campaigns on their own schedule
- Groups of friends (starting with 2 — MVP targets a parent playing with a child) who want a shared adventure from separate devices
- Beginners curious about fantasy RPG who want a guided entry point

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Narrative Character Creation (Priority: P1)

As a player, I want to create my character through a conversation with the AI so that I never have to fill out a form.

**Why this priority**: Character creation is the entry point to the entire experience. Without a character, no campaign can begin. This story validates the core thesis that conversational input replaces forms.

**Independent Test**: A player can open the app, have a 5–8 exchange conversation with the AI, and end up with a fully formed character (class, race, attributes, starting equipment, backstory) — without ever seeing a form field.

**Acceptance Scenarios**:

1. **Given** a player starts a new campaign, **When** the AI begins character creation, **Then** the AI asks narrative questions (e.g., "Were you born in a fishing village or did you grow up in the streets of a busy city?") — never technical ones (e.g., "Select your race")
2. **Given** the player answers freely in natural language, **When** the AI processes each response, **Then** it adapts to any answer and derives class, race, attributes, starting equipment, and backstory from the conversation
3. **Given** the conversation reaches 5–8 exchanges, **When** the AI has enough context, **Then** it suggests a class and race based on answers — but the player can override
4. **Given** the character's personality has been established, **When** the AI asks for the character's name, **Then** the name is asked at the end (after personality, not before)
5. **Given** the character creation is complete, **When** the player views their character, **Then** raw D&D stat numbers are hidden by default — visible only if the player taps "Technical View"

---

### User Story 2 — Character Portrait Generation (Priority: P1)

As a player, I want a pixel art portrait of my character generated at the end of creation so that my character feels real and mine.

**Why this priority**: The portrait is the character's visual identity and the first "wow moment" — the celebration that validates the conversational creation process.

**Independent Test**: After completing character creation, the player sees a unique pixel art portrait that visually matches the character they described, revealed with a dramatic animation.

**Acceptance Scenarios**:

1. **Given** the creation conversation concludes, **When** the portrait generation begins, **Then** a narrative animation plays ("the artist is drawing your character...") — never a spinner or progress bar
2. **Given** the portrait is generated, **When** it is revealed, **Then** it appears with a dramatic emergence animation (character appearing from darkness) lasting at least 2 seconds
3. **Given** the portrait is revealed, **When** the player continues, **Then** the portrait is saved permanently as the character's visual identity (avatar in chat, miniature alongside dice rolls, face during key moments)
4. **Given** two players create characters with similar choices, **When** portraits are generated, **Then** each portrait is genuinely distinct

---

### User Story 3 — Character Sheet: Dual Mode (Priority: P2)

As a player, I want to view my character either as an immersive narrative summary or as actual D&D numbers depending on my preference.

**Why this priority**: Serves both immersion-first players and mechanically-curious players without forcing either experience on the other.

**Independent Test**: A player can toggle between Narrative Mode and Technical Mode with a single tap and see the same character data presented in two distinct formats.

**Acceptance Scenarios**:

1. **Given** the player opens the character sheet, **When** it loads in Narrative Mode (default), **Then** all attributes are described as prose (e.g., "You are a seasoned warrior, your body hardened by years of battle, your instincts sharp enough to sense danger before it arrives")
2. **Given** the player is viewing Narrative Mode, **When** they tap the mode toggle, **Then** Technical Mode shows a standard D&D 5e stat block with all numbers, modifiers, saving throws, and skills
3. **Given** the player is in a session, **When** they access the character sheet, **Then** it is accessible from the in-session HUD without navigating away from the session
4. **Given** the character gains XP or items during a campaign, **When** the player views the character sheet, **Then** stats reflect current progression (level, new items, updated modifiers)

---

### User Story 4 — Character Persistence (Priority: P2)

As a player, I want my character to persist across sessions within a campaign so that progress is never lost.

**Why this priority**: Without persistence, multi-session campaigns are impossible — and multi-session play is core to the D&D experience.

**Independent Test**: A player can close the app, reopen it hours or days later, and resume the campaign with the exact same character state (stats, inventory, backstory, portrait, location, active quests, NPC relationships).

**Acceptance Scenarios**:

1. **Given** a character is created, **When** the player closes the app, **Then** all character data (stats, inventory, backstory, portrait) is saved locally
2. **Given** the player is mid-session, **When** a narrative exchange occurs, **Then** session state is saved automatically after every exchange
3. **Given** the player returns to a campaign, **When** they resume, **Then** the exact state is restored: location, inventory, active quests, NPC relationship states
4. **Given** a player has an active campaign, **When** they view their campaigns, **Then** characters are tied to specific campaigns (one character per campaign slot)

---

### User Story 5 — World Selection (Priority: P1)

As a player, I want to browse available worlds as a visual gallery so that I choose a world that feels right before committing to a story.

**Why this priority**: World selection is the first decision in starting a campaign — it sets the entire aesthetic, mythology, and narrative constraints.

**Independent Test**: A player can browse a gallery of world cards, see pixel art and hear ambient audio for each, and select one to proceed.

**Acceptance Scenarios**:

1. **Given** the player starts a new campaign, **When** the world selection screen loads, **Then** it displays a gallery of large visual cards (not a list)
2. **Given** a world card is displayed, **When** the player focuses on it, **Then** a 10-second ambient audio loop plays for that world
3. **Given** the MVP launch, **When** the player views available worlds, **Then** only Valdris (High Fantasy) is fully available — other worlds (Ferrumclave, Vazio entre Estrelas, Thalassar, Cinzas de Umbra, Kenhado) are visually present but locked/coming soon
4. **Given** a world card, **When** the player reads its description, **Then** it communicates the world's fundamental rule and central tension (e.g., Valdris: "The gods are dead. Their power scattered. Every kingdom was built on a fragment — and the fragments are disappearing.")
5. **Given** each world, **When** it is defined, **Then** it has 4 mandatory attributes: fundamental rule, central tension, what cannot exist here, and aesthetic identity

---

### User Story 6 — Adventure Type Selection (Priority: P2)

As a player, I want to select an adventure type within my chosen world so that the gameplay structure matches how I want to play.

**Why this priority**: Adventure types add replayability and structural variety — the same world can host very different gameplay experiences.

**Independent Test**: After selecting Valdris, the player can choose between 4 adventure types and see a preview of each type's gameplay structure.

**Acceptance Scenarios**:

1. **Given** the player has chosen a world, **When** the adventure type selection screen loads, **Then** adventure types are presented as gameplay structure descriptors with a short example opening line
2. **Given** any world, **When** adventure types are displayed, **Then** 4 adventure types are available: Dungeon Crawl (linear, action-heavy, frequent dice), Wilderness Exploration (open discovery, balanced pacing, moderate dice), Political Intrigue (NPC-network navigation, narrative-heavy, low but high-stakes dice), Horror & Survival (escalating revelation, moderate dice)
3. **Given** the player selects an adventure type, **When** the campaign begins, **Then** the AI's gameplay structure, pacing, challenge types, and dice usage frequency shift to match the selected adventure type — while the world provides the narrative tone
4. **Given** each adventure type, **When** it is defined, **Then** it has 5 attributes: structure, pacing, primary challenge, dice usage pattern, and duo suitability

---

### User Story 7 — Campaign Start with Opening Hooks (Priority: P1)

As a player, I want to be presented with 3 AI-generated opening hooks after choosing my world and adventure type so that I can choose the story that excites me most.

**Why this priority**: The opening hook is where the player commits to a story — it must excite them and feel unique.

**Independent Test**: After selecting world and adventure type, the player sees 3 distinct opening hooks and can pick one or request more.

**Acceptance Scenarios**:

1. **Given** the player has selected a world and adventure type, **When** the campaign start screen loads, **Then** 3 distinct AI-generated opening hooks are displayed
2. **Given** an opening hook, **When** the player reads it, **Then** it is 2–3 sentences containing a scene, a conflict, and a question that draws the player in
3. **Given** the player does not like any hook, **When** they tap "Generate more options", **Then** 3 new hooks are generated
4. **Given** the same world + adventure type combination is played twice, **When** hooks are generated, **Then** they produce different hooks each time
5. **Given** the player selects a hook, **When** the campaign begins, **Then** it starts immediately with that scene painted in pixel art

---

### User Story 8 — Campaign Hub (Priority: P2)

As a player, I want a central place to see all my active campaigns so I can switch between them or start a new one.

**Why this priority**: The campaign hub is the home screen — the player's gateway to all their adventures.

**Independent Test**: A player with an active campaign can see it as a card with all relevant metadata and resume it with a single tap.

**Acceptance Scenarios**:

1. **Given** the player has active campaigns, **When** the campaign hub loads, **Then** each campaign is displayed as a card showing: campaign name, world badge, adventure type, sessions played, last played date, and a thumbnail of the most recent scene illustration
2. **Given** the player taps a campaign card, **When** the campaign loads, **Then** it resumes from the exact last state
3. **Given** the player is on the free tier, **When** they have 1 active campaign and try to start another, **Then** they are prompted to archive or continue the existing one
4. **Given** the player wants to start a new campaign, **When** they have an available campaign slot, **Then** a "New Campaign" option leads to world selection

---

### User Story 9 — Narrative Exchange with the DM (Priority: P1)

As a player, I want to interact with the AI Dungeon Master through natural language so that the session feels like a real D&D conversation.

**Why this priority**: This is the core gameplay loop — every other feature serves this interaction. Without narrative exchange, there is no game.

**Independent Test**: A player can type any action in natural language, and the AI responds with immersive narrative text that advances the story.

**Acceptance Scenarios**:

1. **Given** the player is in an active session, **When** they type an action (e.g., "I approach the innkeeper and ask if anyone has been asking about the old mine"), **Then** the AI interprets intent, determines if a skill check applies, requests a dice roll if needed, and narrates the result
2. **Given** the AI responds, **When** the response is displayed, **Then** it is always narrative — never mechanical (always "The innkeeper's eyes narrow before he leans in and whispers...", never "You rolled 14 vs DC 12, success")
3. **Given** the AI responds, **When** contextual action buttons appear, **Then** they serve as quick options — but free text input always works
4. **Given** the player has established context in previous exchanges or sessions, **When** the AI responds, **Then** it maintains all established context

---

### User Story 10 — Dice Roll Request (Priority: P1)

As a player, I want the AI to pause the narration and delegate a dice roll to me when the outcome is uncertain so that I feel the tension of the moment.

**Why this priority**: Dice delegation is a constitutional principle (§Dice) — the player must always roll when the outcome matters.

**Independent Test**: The AI narrates to a moment of tension, pauses, requests a specific dice roll, and the player rolls before the AI resumes.

**Acceptance Scenarios**:

1. **Given** a significant action requires a check, **When** the AI narrates, **Then** it narrates to the moment of tension and stops (e.g., "You steady your hands. Roll Arcana to know if the spell obeys.")
2. **Given** the AI has requested a roll, **When** the dice appears on screen, **Then** the narrative is paused, waiting for the player to roll
3. **Given** the player has rolled, **When** the result is determined, **Then** the AI resumes narration incorporating the result
4. **Given** a trivial action that would not require a check in D&D, **When** the player attempts it, **Then** the AI narrates success without interrupting for a roll

---

### User Story 11 — NPC Emotional States (Priority: P3)

As a player, I want NPCs to remember how I've treated them and react accordingly so that my choices have lasting consequences.

**Why this priority**: NPC memory creates meaningful consequences, but the core loop functions without it. This adds depth once the foundation is solid.

**Independent Test**: A player can gain an NPC's trust through kind actions and later receive information the NPC would not share with a stranger.

**Acceptance Scenarios**:

1. **Given** the player encounters an NPC, **When** the AI tracks the interaction, **Then** the NPC has an internal state (trust, fear, anger, gratitude) that is hidden from the player
2. **Given** NPC states exist, **When** the player resumes a session, **Then** NPC states persist across sessions within the campaign
3. **Given** a trusted NPC, **When** the player asks for information, **Then** the NPC shares freely — a fearful NPC is evasive, an angry NPC is hostile
4. **Given** the player betrays an NPC, **When** they interact with that NPC again, **Then** the NPC's trust decreases and behavior changes accordingly

---

### User Story 12 — Campaign Memory & Session Summary (Priority: P1)

As a player, I want the AI to remember everything that happened in previous sessions so I can take a break and return without losing the narrative thread.

**Why this priority**: Without campaign memory, multi-session play breaks down. Players must be able to leave and return without losing the story.

**Independent Test**: A player can close a session, return days later, and the AI delivers a narrative recap before resuming from the exact point they left off.

**Acceptance Scenarios**:

1. **Given** the player is in a session, **When** a narrative exchange occurs, **Then** all events are persisted locally after each exchange
2. **Given** the player resumes a campaign, **When** the session begins, **Then** the AI delivers a narrative recap ("When last we left our hero...") in the campaign's narrative voice
3. **Given** a session ends, **When** the player exits, **Then** a session summary is generated automatically and accessible from the campaign hub as readable narrative text
4. **Given** context approaches model limits, **When** the system manages context, **Then** raw history is compressed into a State Document (characters, key events, alliances, active quests, locations, current arc) — the AI receives the State Document plus recent exchanges, never the full raw history

---

### User Story 13 — Difficulty Adaptation (Priority: P3)

As a player, I want the AI to adapt challenge difficulty based on my character's level and play style so that the experience feels fair and engaging.

**Why this priority**: Difficulty balance is important for engagement but is a tuning concern that can be refined after core mechanics are proven.

**Independent Test**: A beginner-difficulty player never has their character killed on the first failure — near-death experiences lead to dramatic escapes.

**Acceptance Scenarios**:

1. **Given** the player creates a character, **When** the AI asks about difficulty, **Then** 3 options are presented: Beginner, Standard, Hardcore
2. **Given** the player's character has progressed, **When** the AI generates encounters, **Then** difficulty is proportional to character level
3. **Given** Beginner or Standard difficulty, **When** the character fails critically, **Then** the AI never kills the character on the first failure — near-death leads to dramatic escapes or unconsciousness. Death only occurs after multiple escalating failures
4. **Given** Hardcore difficulty, **When** the character suffers a fatal failure, **Then** death is permanent — the AI narrates a dramatic epilogue and the campaign ends
5. **Given** a character dies at any difficulty, **When** the campaign ends, **Then** the character cannot be revived. The player can start a new campaign

---

### User Story 14 — Physical Dice Roll (Priority: P1)

As a player, I want to roll a physical dice on screen with realistic physics so that every roll feels like a real moment, not a button press.

**Why this priority**: The dice roll is a constitutional principle (§Dice) and a defining product experience — every roll must feel physical and dramatic.

**Independent Test**: A player shakes their device or taps the screen, and a dice bounces, tumbles, and settles with visible physics in 1.5–3 seconds.

**Acceptance Scenarios**:

1. **Given** a roll is requested, **When** the dice appears, **Then** the player can shake the device or tap to roll
2. **Given** the player initiates a roll, **When** the dice moves, **Then** it bounces off screen edges, tumbles, and settles naturally with real 2D physics
3. **Given** the dice is rolling, **When** it settles, **Then** the number that lands face-up is the result — the animation takes 1.5–3 seconds
4. **Given** the dice has settled, **When** the result is shown, **Then** a brief pause occurs before the AI resumes narration — letting the number breathe

---

### User Story 15 — Dice Type System (Priority: P2)

As a player, I want the correct dice type to appear for each roll so that the game feels mechanically authentic.

**Why this priority**: Dice type correctness adds mechanical authenticity, but the core experience works with just a d20.

**Independent Test**: When the AI requests a d6 damage roll, a d6 appears on screen (not a d20).

**Acceptance Scenarios**:

1. **Given** the AI requests a roll, **When** it specifies a dice type (d4, d6, d8, d10, d12, d20), **Then** the correct dice shape appears on screen
2. **Given** a d20 roll, **When** the dice appears, **Then** it is larger with a more elaborate tumble animation and slightly slower settle than other dice
3. **Given** a multi-dice roll (e.g., 2d6 for damage), **When** the dice appear, **Then** both dice are shown simultaneously with independent physics

---

### User Story 16 — Critical Hit & Critical Failure (Priority: P1)

As a player, I want natural 20s and natural 1s to be celebrated (or lamented) with special visual and narrative reactions so that these moments are unforgettable.

**Why this priority**: Critical moments are the most memorable part of D&D — they must be treated as product-defining experiences.

**Independent Test**: A natural 20 triggers a gold particle burst and triumphant audio; a natural 1 triggers a red shatter and deflating audio — both followed by exaggerated AI narration.

**Acceptance Scenarios**:

1. **Given** the player rolls a natural 20, **When** the result is shown, **Then** a gold particle burst animation plays, a triumphant audio sting sounds, and the AI delivers an exaggerated triumphant narrative response
2. **Given** the player rolls a natural 1, **When** the result is shown, **Then** a red shatter animation plays, a deflating audio sting sounds, and the AI delivers an exaggerated catastrophic (but not punitive) narrative response
3. **Given** a multiplayer session, **When** a critical result occurs, **Then** the animation is broadcast to all players before the AI resumes
4. **Given** the first critical in a session, **When** the animation plays, **Then** it cannot be skipped (can be shortened in settings for subsequent occurrences)

---

### User Story 17 — Multiplayer Dice Spectating (Priority: P2)

As a player in a multiplayer session, I want to watch my partner's dice roll in real time so that we experience the tension together.

**Why this priority**: Shared dice tension is what makes multiplayer different from solo — but solo play works without it.

**Independent Test**: When one player rolls, the other player sees the same dice animation on their screen in real time.

**Acceptance Scenarios**:

1. **Given** the active player is rolling, **When** the dice animates, **Then** all other players see the same dice animation on their screen
2. **Given** a dice is in motion, **When** all players are watching, **Then** narration is paused for all until the dice settles
3. **Given** the dice settles, **When** the result is determined, **Then** it is broadcast simultaneously to all devices
4. **Given** one player is waiting, **When** the other player's dice is rolling, **Then** a "waiting for [player name] to roll..." indicator shows

---

### User Story 18 — Scene Illustration Generation (Priority: P1)

As a player, I want a pixel art illustration generated at every significant scene change so that I can visualize the world I'm inhabiting.

**Why this priority**: Visual world-building is a core pillar — the player must see their adventure, not just read it.

**Independent Test**: When a location changes, a new pixel art illustration appears with a fade-in animation that matches the current scene.

**Acceptance Scenarios**:

1. **Given** a significant scene change (campaign start, location change, major encounter, dramatic reveal, session cliffhanger), **When** the AI identifies it, **Then** a new pixel art illustration is generated
2. **Given** illustration generation is in progress, **When** the player sees the screen, **Then** the previous illustration remains visible (no loading state shown)
3. **Given** the illustration is ready, **When** it appears, **Then** it fades in smoothly (not a sudden swap)
4. **Given** an illustration has been generated, **When** the session history is reviewed, **Then** the illustration is saved as part of the session history

---

### User Story 19 — Scene Illustration Composition (Priority: P2)

As a player, I want illustrations to accurately reflect my character and the current scene so that they feel personal, not generic.

**Why this priority**: Generic illustrations break immersion. Accurate composition validates the pixel art pipeline.

**Independent Test**: An illustration of a tavern scene at night with the player's elven ranger present shows the correct setting, time, and a recognizable version of the player's character.

**Acceptance Scenarios**:

1. **Given** a scene is being illustrated, **When** the visual prompt is composed, **Then** it incorporates: current location and time of day, characters present, active NPCs, emotional tone, and active weather or environmental effects
2. **Given** the Valdris world, **When** illustrations are generated, **Then** the color palette uses rich blues, forest greens, and torch oranges
3. **Given** the player's character has been created, **When** they appear in a scene illustration, **Then** their visual appearance is consistent with their portrait

---

### User Story 20 — Character Portrait in Scene (Priority: P3)

As a player, I want my character's portrait to appear within combat and key decision scenes so that I feel present in the moment.

**Why this priority**: A nice-to-have enhancement that deepens immersion but is not required for the core loop.

**Independent Test**: During combat, the player's portrait appears as a small frame in the bottom corner of the scene illustration.

**Acceptance Scenarios**:

1. **Given** a combat scene, **When** the illustration is displayed, **Then** the player's portrait appears in the bottom corner as a small portrait frame
2. **Given** a critical decision, **When** a dice roll is about to be requested, **Then** the portrait briefly appears with a subtle glow
3. **Given** portrait frames are displayed, **When** the player views them, **Then** they are styled consistently with the world's visual aesthetic

---

### User Story 21 — Multiplayer Session Creation & Joining (Priority: P1)

As a player, I want to create a multiplayer session and invite my partner so we can play together from separate devices.

**Why this priority**: Multiplayer is a core MVP feature — the initial target is a parent playing with a child.

**Independent Test**: One player creates a session, shares a code, and the other player joins using that code — both are connected and ready to play.

**Acceptance Scenarios**:

1. **Given** the player creates a multiplayer session, **When** the session is initialized, **Then** a short session code is generated (e.g., DRAGON-42)
2. **Given** the joining player has the code, **When** they enter it, **Then** they connect to the session
3. **Given** both players are connected, **When** both have completed character creation, **Then** the session begins
4. **Given** connection is pending, **When** the creator waits, **Then** "Waiting for partner..." is shown with a cancel option
5. **Given** a player disconnects mid-session, **When** the other player is still connected, **Then** "Waiting for [player name] to reconnect..." shows for up to 5 minutes before allowing solo continuation

---

### User Story 22 — Shared Session State (Priority: P2)

As a player in a multiplayer session, I want both players to always see the same scene, narration, and dice results so that we are truly in the same world.

**Why this priority**: State sync is what makes multiplayer feel like a shared adventure rather than two solo games.

**Independent Test**: Both players see the same narration, illustration, and dice result at the same time.

**Acceptance Scenarios**:

1. **Given** the AI narrates, **When** the response is delivered, **Then** it appears simultaneously on both devices
2. **Given** a scene illustration is generated, **When** it is ready, **Then** it is synced to both devices
3. **Given** both players can submit actions, **When** one action is being processed, **Then** only one action is processed at a time — a cooperative turn order is established at session start
4. **Given** the in-game chat is active, **When** either player sends a message, **Then** it is visible to both players in real time

---

### User Story 23 — In-Game Chat: 3 Layers (Priority: P2)

As a player in a multiplayer session, I want a chat system that separates the DM's narration, my character's speech, and my out-of-character communication so that immersion is maintained.

**Why this priority**: Layer separation is critical for immersion in multiplayer — without it, game text and casual chat blur together.

**Independent Test**: A player can see narration in amber/gold, their character's speech with their portrait, and out-of-character text in muted gray — all clearly distinct.

**Acceptance Scenarios**:

1. **Given** the AI DM sends narration, **When** it appears in chat, **Then** it uses a distinct font (slightly larger, serif or italic) in amber/gold color
2. **Given** a player speaks in-character, **When** the message appears, **Then** it is prefixed with the character's name and portrait avatar, styled with the world's color palette
3. **Given** a player speaks out-of-character, **When** the message appears, **Then** it is small, muted gray text in brackets (e.g., "[Are you still there?]")
4. **Given** a player wants to switch speech mode, **When** they use the toggle, **Then** they switch between in-character and out-of-character with a single tap — not by typing syntax
5. **Given** an out-of-character message is sent, **When** the AI processes messages, **Then** the AI DM does not respond to out-of-character messages

---

### User Story 24 — Session Resume Notification (Priority: P3)

As a player in an active campaign, I want a notification when it's my turn in a multiplayer session so that I can return when I'm ready.

**Why this priority**: Notifications enhance multiplayer flow but are not required for the core session to function.

**Independent Test**: A player whose partner has taken an action receives a push notification and taps it to resume the session.

**Acceptance Scenarios**:

1. **Given** a multiplayer partner has taken their action, **When** it is now the waiting player's turn, **Then** a notification is sent: "It's your turn in 'Ashes of the Empire'!"
2. **Given** a notification is received, **When** the player taps it, **Then** the campaign opens directly at the current state
3. **Given** the player's app is in the foreground, **When** it's their turn, **Then** no notification is sent

---

### User Story 25 — Campaign Summary Notification (Priority: P3)

As a player, I want a notification when a session summary is generated so that I can review what happened.

**Why this priority**: Enhances the session-end experience but is not blocking for core gameplay.

**Independent Test**: After ending a session, the player receives a notification linking to a narrative chapter recap.

**Acceptance Scenarios**:

1. **Given** a session ends, **When** the summary is generated, **Then** a notification is sent: "Your session summary for '[Campaign Name]' is ready."
2. **Given** the player taps the notification, **When** the summary opens, **Then** it reads as a narrative chapter recap, not a log of events

---

### User Story 26 — Story Continuation Prompt (Priority: P3)

As a player, I want a gentle nudge if I haven't played a campaign in a while so that I'm reminded the story is waiting.

**Why this priority**: Retention nudge — enhances re-engagement but is a low-priority polish feature.

**Independent Test**: A player who hasn't played for 7 days receives a single narrative notification and can dismiss or disable it.

**Acceptance Scenarios**:

1. **Given** a campaign has been inactive for 7 days, **When** the system checks, **Then** a notification is sent: "[Character Name] is still waiting in [last known location]. Continue the adventure?"
2. **Given** a nudge was sent, **When** 7 more days pass without activity, **Then** maximum 1 nudge per campaign per 7-day period
3. **Given** a nudge notification, **When** the player taps it, **Then** the campaign resumes with a brief AI recap
4. **Given** the player does not want nudges, **When** they adjust settings, **Then** nudges are dismissible and disableable per campaign

---

### Edge Cases

- **What happens when the AI generates a character class that contradicts the player's answers?** The AI must re-derive and present a corrected suggestion, always deferring to the player's intent.
- **What happens when portrait generation fails or times out (>15 seconds)?** A narrative fallback ("Your portrait will emerge when the light finds you...") is shown with a retry option. The campaign can proceed without a portrait.
- **What happens when both multiplayer players submit actions simultaneously?** Only the action from the player whose turn it is gets processed. The other player's action is queued or the player is notified to wait.
- **What happens when the AI's response contradicts established campaign facts?** The State Document serves as the source of truth. The system prompt must instruct the AI to never contradict the State Document.
- **What happens when the player types something completely outside the game world (e.g., "What's the weather like in New York?")?** The AI stays in character and redirects narratively ("The wind here speaks only of the mountains ahead, adventurer. What do you do?") — never acknowledges the real world.
- **What happens when a multiplayer player is disconnected for more than 5 minutes?** The connected player is given the option to continue solo. The disconnected player can rejoin later and see what happened.
- **What happens when the free tier player's campaign slot is full and they try to start a new campaign?** They are prompted to archive the existing campaign (preserving data but freeing the slot) or continue it.
- **What happens when the dice physics engine produces an ambiguous result (dice on edge)?** The dice is re-settled using a small physics nudge. If still ambiguous, a re-roll is triggered automatically with a narrative beat.
- **What happens when the player provides an empty or nonsensical input?** The AI stays in character and prompts for clarification narratively ("The winds carry your words away before they reach me. Speak again, adventurer.").
- **What happens when a character dies?** The AI narrates a dramatic epilogue. The campaign ends permanently — the character cannot be revived. The player is returned to the campaign hub and can start a new campaign. In multiplayer, both players see the death and epilogue; the campaign ends for both.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST conduct character creation through a narrative conversation of 5–8 exchanges, deriving class, race, attributes, starting equipment, and backstory from the player's natural language answers
- **FR-002**: The system MUST generate a unique pixel art portrait at the end of character creation based on the character's full description (race, class, personality, backstory, equipment)
- **FR-003**: The system MUST provide dual-mode character viewing: Narrative Mode (prose descriptions, default) and Technical Mode (D&D 5e stat block), togglable with a single tap
- **FR-004**: The system MUST persist all character and campaign data locally, saving automatically after every narrative exchange
- **FR-005**: The system MUST present worlds as a visual gallery of large cards with pixel art and ambient audio. Each world is defined by 4 mandatory attributes: fundamental rule, central tension, what cannot exist here, and aesthetic identity
- **FR-006**: The system MUST present adventure types as gameplay structure descriptors with example opening lines. Adventure types are transversal across all worlds and define gameplay structure, pacing, challenge type, and dice usage — not narrative tone
- **FR-007**: The system MUST generate 3 distinct AI-generated opening hooks per world + adventure type combination, with a "Generate more" option
- **FR-008**: The system MUST display active campaigns in a hub as cards with: campaign name, world badge, adventure type, sessions played, last played date, and most recent scene thumbnail
- **FR-009**: The system MUST process player actions in natural language, interpreting intent, applying D&D rules invisibly, and narrating results — never exposing mechanical details unless the player requests Technical Mode
- **FR-010**: The system MUST delegate dice rolls to the player when a significant action requires a check, pausing narration until the roll is complete
- **FR-011**: The system MUST track NPC emotional states (trust, fear, anger, gratitude) across sessions and vary NPC behavior based on those states — states are never shown directly to the player
- **FR-012**: The system MUST compress session history into a structured State Document (characters, events, NPCs, quests, world state, narrative arc) to maintain context across sessions within model limits
- **FR-013**: The system MUST generate a narrative session summary at the end of each session, accessible from the campaign hub
- **FR-014**: The system MUST deliver a narrative recap when a player resumes a campaign
- **FR-015**: The system MUST simulate dice with real 2D physics — dice bounce off screen edges, tumble, and settle naturally; the settled face determines the result (not an RNG)
- **FR-016**: The system MUST support all standard D&D dice types: d4, d6, d8, d10, d12, d20 — with the d20 receiving a more elaborate animation
- **FR-017**: The system MUST trigger distinct animations and audio for natural 20 (gold burst, triumphant sting) and natural 1 (red shatter, deflating sting), followed by exaggerated AI narration
- **FR-018**: The system MUST generate pixel art scene illustrations at every significant scene change (location change, major encounter, dramatic reveal, session cliffhanger)
- **FR-019**: Scene illustration prompts MUST incorporate current location, time of day, characters present, emotional tone, and weather — styled in 16-bit pixel art with world-specific color palettes
- **FR-020**: The system MUST allow multiplayer session creation via short codes (e.g., DRAGON-42), with the session starting when both players are connected and have completed character creation
- **FR-021**: The system MUST synchronize all session state (narration, scene illustrations, dice rolls, chat) in real time between both devices in a multiplayer session
- **FR-022**: The system MUST support 3-layer chat: Narration (amber/gold, serif font), In-character (character name + portrait, world palette), Out-of-character (muted gray, bracketed)
- **FR-023**: The system MUST send contextual notifications: turn reminders (multiplayer), session summaries, and story continuation nudges (7-day inactivity)
- **FR-024**: The system MUST allow dice rolls via both device shake and tap gesture
- **FR-025**: The system MUST stream AI narration token by token (word by word), never as a block
- **FR-026**: The system MUST limit free tier to 1 active campaign, solo mode only
- **FR-027**: The AI MUST never break character except for critical safety messages — all errors, loading states, and system events MUST be wrapped in narrative language
- **FR-028**: The AI MUST never act on behalf of the player's character without explicit instruction
- **FR-029**: The AI MUST never reference the real world, real public figures, or real historical events in campaigns
- **FR-030**: All AI narration, character creation dialogue, session summaries, and contextual action buttons MUST be in Brazilian Portuguese (pt-BR). All UI text (labels, buttons, menus, notifications) MUST also be in pt-BR
- **FR-031**: The AI MUST default to family-friendly content: no graphic violence, sexual content, or extreme horror. Descriptions of combat and danger MUST remain age-appropriate (suggestive, not explicit)
- **FR-032**: The system MUST provide a "Mature" content toggle accessible from campaign settings. When enabled, the AI may include darker themes, more intense descriptions, and morally complex scenarios appropriate for adult audiences. The toggle MUST default to off
- **FR-033**: The system MUST allow the player to export all campaign data (character, sessions, summaries, illustrations) as a downloadable file and permanently delete any campaign or all player data from the device at any time

### Non-Functional Requirements

- **NFR-001**: Cold launch to an interactive state MUST complete in under 2 seconds on devices from 2020 or newer
- **NFR-002**: Dice physics MUST render at 60fps during roll animation on devices from 2020 or newer
- **NFR-003**: AI narration first token MUST appear within 1.5 seconds of player action submission
- **NFR-004**: Scene illustration generation request MUST be initiated within 500ms of scene change detection
- **NFR-005**: Multiplayer event broadcast latency MUST be under 300ms on 4G connections
- **NFR-006**: No loading spinners MUST be visible to the player — all waits MUST be masked with narrative or animation
- **NFR-007**: Scene transitions MUST use a 500ms fade-in, never a hard cut
- **NFR-008**: Portrait reveal animation MUST last at least 2 seconds and cannot be skipped on first view
- **NFR-009**: Solo play (except AI narration) MUST function fully offline
- **NFR-010**: No gameplay content MUST be sent to any server beyond the LLM and image generation APIs required for narration and illustration
- **NFR-011**: No account MUST be required for solo play
- **NFR-012**: Session data shared via multiplayer sync MUST be scoped to the active session and purged 24 hours after session end
- **NFR-013**: All interactive elements MUST have accessible labels; dice roll MUST be triggerable by tap; narration text MUST be scalable; screen readers MUST announce dice results and narration updates

### Key Entities

- **Player**: The human user. Has settings, notification preferences, and subscription tier. Can have multiple campaigns (limited by tier).
- **Character**: A player's in-game identity within a campaign. Has name, race, class, level, attributes, HP, inventory, backstory, portrait, and personality traits. One character per campaign.
- **Campaign**: A specific story within a world + adventure type. Has a name (AI-generated), opening hook, session history, State Document, and active/archived status.
- **World**: A self-contained setting defined by 4 mandatory attributes: fundamental rule, central tension, what cannot exist here, and aesthetic identity. Has a name, description, pixel art palette, dice skin, ambient audio, and AI vocabulary modifiers. MVP: Valdris (High Fantasy) only. Post-MVP worlds: Ferrumclave (Steampunk), Vazio entre Estrelas (Sci-fi), Thalassar (Eternal Seas), Cinzas de Umbra (Dark Fantasy), Kenhado (Mythic Orient) — via feature flags.
- **Adventure Type**: The structural mode of gameplay, transversal across all worlds. Has 5 attributes: structure, pacing, primary challenge, dice usage pattern, and duo suitability. Defines gameplay structure — not narrative tone. 4 types: Dungeon Crawl, Wilderness Exploration, Political Intrigue, Horror & Survival.
- **Session**: A single play period within a campaign. Starts when the player enters the campaign; ends when the player explicitly exits or closes the app. Has raw exchange history, a session summary (generated on exit), generated illustrations, and timestamps.
- **NPC**: A non-player character encountered in a campaign. Has a name, description, emotional state (trust, fear, anger, gratitude), and interaction history.
- **State Document**: A compressed representation of campaign state used for AI context. Contains: active characters, session events, NPC registry, active quests, world state, and narrative arc. Max 4,000 tokens.
- **Scene Illustration**: A generated pixel art image tied to a specific moment in a session. Has a visual prompt, image file, and timestamp.
- **Session Summary**: An AI-generated narrative recap of a completed session. Readable as a chapter in a story.

## Clarifications

### Session 2026-02-23

- Q: What language does the AI DM narrate in, and what language is the UI? → A: Brazilian Portuguese only for MVP. All AI narration, UI text, and system prompts are in pt-BR.
- Q: What content maturity level does the AI enforce, given the child target audience? → A: Family-friendly by default (no graphic violence, sexual content, or extreme horror). An optional "Mature" content toggle is available for adult groups.
- Q: What happens when a character dies? → A: Character death ends the campaign with a dramatic AI-narrated epilogue. The character cannot be revived. The player can start a new campaign. At Beginner/Standard, death only occurs after multiple escalating failures. At Hardcore, death is permanent and can occur after any critical failure.
- Q: When does a session start and end? → A: A session starts when the player enters a campaign and ends when they explicitly exit or close the app. The system auto-saves continuously. Session summary is generated on exit.
- Q: World architecture — what replaces the Universe → Theme → Campaign hierarchy? → A: World → Adventure Type → Campaign. World is a self-contained setting (4 attributes: fundamental rule, central tension, what cannot exist, aesthetic identity). Adventure Type is the transversal gameplay structure (not narrative tone). Campaign is procedurally generated from world + adventure type.
- Q: How many worlds and what are they? → A: 6 worlds defined. MVP: Valdris (High Fantasy). Post-MVP via feature flags: Ferrumclave (Steampunk), Vazio entre Estrelas (Sci-fi), Thalassar (Eternal Seas), Cinzas de Umbra (Dark Fantasy), Kenhado (Mythic Orient).
- Q: What are the 4 adventure types? → A: Dungeon Crawl (linear, action-heavy, frequent dice), Wilderness Exploration (open, balanced, moderate dice), Political Intrigue (NPC-network, narrative-heavy, low dice), Horror & Survival (escalating revelation, moderate dice). Each has 5 attributes: structure, pacing, primary challenge, dice usage, duo suitability.
- Q: How many adventure types? → A: Exactly 4. Final and intentional — one per primary mode of D&D gameplay.
- Q: What is the updated DM Engine system prompt order? → A: 1. world_definition, 2. adventure_type_definition, 3. dm_persona, 4. d&d_rules_reference, 5. campaign_state_document, 6. recent_history, 7. current player action. World and adventure type are injected as separate hard constraints before the persona.

## Assumptions

- The primary LLM (Claude Sonnet 4.6) and fallback LLM (Gemini Flash 3.0) provide sufficient context window and narrative quality for the DM Engine's requirements
- SDXL + pixel art LoRA via Replicate produces consistent 16-bit pixel art quality within the 15-second generation window
- 2D dice physics (Matter.js or equivalent) can produce satisfying, physically believable dice behavior within the 60fps target
- Supabase Realtime provides sub-300ms event broadcast latency on standard mobile connections
- A 4,000-token State Document is sufficient to maintain narrative coherence across 5+ sessions
- Device shake detection (accelerometer threshold: 1.5g) is reliable across modern iOS and Android devices
- The free tier (1 active campaign, solo mode) is engaging enough to create love for the product without feeling artificially limited — no scene limit within a campaign
- MVP targets Brazilian Portuguese (pt-BR) only. Internationalization (English, other languages) is post-MVP

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can complete character creation and reach the first scene illustration within 5 minutes of first launch
- **SC-002**: A 2-player session can be started and the first narrative exchange completed within 3 minutes of both players opening the app
- **SC-003**: The dice physics feel physical and satisfying to 80%+ of playtesters in usability testing
- **SC-004**: The AI DM maintains narrative consistency (no contradictions of established facts) across a 5-session campaign in 90%+ of playtests
- **SC-005**: Pixel art scene illustrations feel contextually accurate (correct setting, tone, characters present) in 80%+ of generated scenes
- **SC-006**: Natural 20 and natural 1 moments are described by playtesters as "memorable" in 90%+ of occurrences
- **SC-007**: Zero player-visible error states or raw system messages from the AI during a standard session
- **SC-008**: The app launches to an interactive state in under 2 seconds on devices from 2020 or newer
- **SC-009**: Solo campaign is fully playable with airplane mode on (except AI narration)
