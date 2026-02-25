-- Multiplayer sessions table
CREATE TABLE IF NOT EXISTS multiplayer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT UNIQUE NOT NULL,
  host_player_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  state_document JSONB DEFAULT '{}',
  recent_history JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, active, ended
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session players junction table
CREATE TABLE IF NOT EXISTS session_players (
  session_code TEXT NOT NULL REFERENCES multiplayer_sessions(session_code) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  is_host BOOLEAN DEFAULT false,
  character_data JSONB,
  is_connected BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (session_code, player_id)
);

-- Push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  player_id TEXT PRIMARY KEY,
  expo_push_token TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for session code lookup
CREATE INDEX IF NOT EXISTS idx_sessions_code ON multiplayer_sessions(session_code) WHERE status != 'ended';

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON multiplayer_sessions(expires_at) WHERE status != 'ended';
