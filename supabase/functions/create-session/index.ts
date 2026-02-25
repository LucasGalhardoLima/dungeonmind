import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const FANTASY_WORDS = [
  'DRAGON', 'CRYSTAL', 'SHADOW', 'RUNE', 'QUEST',
  'WIZARD', 'KNIGHT', 'GOBLIN', 'PHOENIX', 'TITAN',
  'STORM', 'BLADE', 'ARCANE', 'EMBER', 'FROST',
  'VALOR', 'CHAOS', 'MYSTIC', 'WRAITH', 'FORGE',
  'SPIRIT', 'THRONE', 'ORACLE', 'VENOM', 'THUNDER',
  'GRYPHON', 'HYDRA', 'SPECTER', 'RAVEN', 'IRON',
  'FLAME', 'DUNGEON', 'GOLEM', 'WARDEN', 'CRYPT',
  'PLAGUE', 'ZEALOT', 'ETHER', 'MIRAGE', 'BASTION',
  'DIRGE', 'FANG', 'LICH', 'MANTLE', 'NEXUS',
  'PRISM', 'SIGIL', 'TOTEM', 'UMBRA', 'VORTEX',
  'AEGIS', 'BANE', 'CAIRN', 'DUSK', 'ELIXIR',
  'FIEND', 'GLYPH', 'HORDE', 'IVORY', 'JINX',
  'KARMA', 'LORE', 'MIRTH', 'NETHER', 'ONYX',
  'PYRE', 'QUAKE', 'RIFT', 'SHARD', 'THORN',
  'UNDEAD', 'VIGIL', 'WRATH', 'XENOS', 'YONDER',
  'ZENITH', 'ABYSS', 'BRIAR', 'CINDER', 'DRAKE',
  'ECLIPSE', 'FABLE', 'GARNET', 'HAVEN', 'INFERNO',
  'JADE', 'KRAKEN', 'LUNAR', 'MAMMOTH', 'NOBLE',
  'OBSIDIAN', 'PALADIN', 'QUIVER', 'RAPTOR', 'SERPENT',
  'TEMPEST', 'UNICORN', 'VAMPIRE', 'WARLOCK', 'XYPHER',
  'YETI', 'ZOMBIE', 'ANCHOR', 'BANSHEE', 'CHIMERA',
  'DAEMON', 'ENCHANT', 'FALCON', 'GRANITE', 'HELLION',
  'ILLUSION', 'JACKAL', 'KINDLE', 'LABYRINTH', 'MINOTAUR',
  'NECTAR', 'OGRE', 'PHANTOM', 'QUARRY', 'REAPER',
  'SPHINX', 'TRIDENT', 'UTOPIA', 'VIPER', 'WYRM',
  'SENTRY', 'BEACON', 'COBALT', 'DAGGER', 'ENIGMA',
  'FURY', 'GHOUL', 'HERALD', 'INVOKE', 'JESTER',
  'KEEPER', 'LEGION', 'MAGE', 'NOMAD', 'OMEN',
  'PILGRIM', 'CIPHER', 'RANGER', 'SAVAGE', 'TALON',
  'PROWL', 'VANQUISH', 'WILDER', 'ARBOR', 'BLIGHT',
  'CROWN', 'DELUGE', 'EXALT', 'FLARE', 'GRIMOIRE',
  'HARBINGER', 'IMPALE', 'JUGGERNAUT', 'VERTEX', 'LANCE',
  'MAELSTROM', 'NADIR', 'OBELISK', 'PARAGON', 'REVENANT',
  'SCARAB', 'TORRENT', 'ORACLE', 'SENTINEL', 'APEX',
  'BERSERKER', 'COLOSSUS', 'DJINN', 'ETHEREAL', 'FROSTBITE',
  'GARGOYLE', 'HOLLOW', 'ICHOR', 'JAVELIN', 'KESTREL',
  'LEVIATHAN', 'MONARCH', 'NIGHTFALL', 'OBSIDIAN', 'PEGASUS',
  'RAMPART', 'STALWART', 'TRIBUNAL', 'VERDANT', 'WYVERN',
  'AURORA', 'CONDUIT', 'DOMINION', 'EPOCH', 'FENRIR',
  'GALLOWS', 'HALCYON', 'IRONCLAD', 'MONOLITH', 'PANDORA',
] as const;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const MAX_RETRIES = 10;
const SESSION_TTL_HOURS = 24;

function generateSessionCode(): string {
  const word = FANTASY_WORDS[Math.floor(Math.random() * FANTASY_WORDS.length)];
  const number = Math.floor(Math.random() * 90) + 10; // 10-99
  return `${word}-${number}`;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: CORS_HEADERS },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: { host_player_id: string; campaign_id: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: CORS_HEADERS },
      );
    }

    if (!body.host_player_id || !body.campaign_id) {
      return new Response(
        JSON.stringify({ error: 'host_player_id and campaign_id are required' }),
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const sessionCode = generateSessionCode();

      // Check uniqueness against active (non-ended) sessions
      const { data: existing, error: lookupError } = await supabase
        .from('multiplayer_sessions')
        .select('id')
        .eq('session_code', sessionCode)
        .neq('status', 'ended')
        .maybeSingle();

      if (lookupError) {
        return new Response(
          JSON.stringify({ error: 'Database lookup failed', details: lookupError.message }),
          { status: 500, headers: CORS_HEADERS },
        );
      }

      if (existing) {
        // Collision — retry with a new code
        continue;
      }

      // Insert the new session
      const { data: session, error: insertError } = await supabase
        .from('multiplayer_sessions')
        .insert({
          session_code: sessionCode,
          host_player_id: body.host_player_id,
          campaign_id: body.campaign_id,
          expires_at: expiresAt,
          status: 'waiting',
        })
        .select('session_code')
        .single();

      if (insertError) {
        // Unique constraint violation means another request grabbed this code — retry
        if (insertError.code === '23505') {
          continue;
        }
        return new Response(
          JSON.stringify({ error: 'Failed to create session', details: insertError.message }),
          { status: 500, headers: CORS_HEADERS },
        );
      }

      return new Response(
        JSON.stringify({ session_code: session.session_code }),
        { status: 200, headers: CORS_HEADERS },
      );
    }

    // Exhausted all retries
    return new Response(
      JSON.stringify({ error: 'Unable to generate a unique session code. Please try again.' }),
      { status: 500, headers: CORS_HEADERS },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: CORS_HEADERS },
    );
  }
});
