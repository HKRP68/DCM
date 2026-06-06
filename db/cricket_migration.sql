-- Create cricket_matches table
CREATE TABLE IF NOT EXISTS cricket_matches (
    id TEXT PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    host_id BIGINT NOT NULL,
    guest_id BIGINT,
    status TEXT NOT NULL,
    state_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_cricket_matches_chat_id ON cricket_matches(chat_id);
CREATE INDEX IF NOT EXISTS idx_cricket_matches_host_id ON cricket_matches(host_id);
CREATE INDEX IF NOT EXISTS idx_cricket_matches_guest_id ON cricket_matches(guest_id);

-- Profiles Update for Cricket Custom Team Names
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_name TEXT;

-- Profiles Update for Cricket Starter Pack Claim
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS claimed_starter BOOLEAN DEFAULT FALSE;

-- Squad ordering for position-based squad management
ALTER TABLE user_owned_players ADD COLUMN IF NOT EXISTS squad_order INT DEFAULT 0;
