-- Cricket feature persistence
--
-- This migration is safe to run directly in a fresh Supabase project or in an
-- existing project. Create the base tables that later ALTER TABLE statements
-- depend on before adding cricket-specific columns.

CREATE TABLE IF NOT EXISTS public.profiles (
    user_id BIGINT PRIMARY KEY,
    first_name TEXT,
    wins INT NOT NULL DEFAULT 0,
    matches_played INT NOT NULL DEFAULT 0,
    coins INT NOT NULL DEFAULT 2000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_owned_players (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    player_id TEXT NOT NULL,
    sport TEXT NOT NULL,
    squad_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_owned_players_user_id
    ON public.user_owned_players(user_id);
CREATE INDEX IF NOT EXISTS idx_user_owned_players_sport
    ON public.user_owned_players(sport);
CREATE INDEX IF NOT EXISTS idx_user_owned_players_user_sport
    ON public.user_owned_players(user_id, sport);

-- Create cricket_matches table
CREATE TABLE IF NOT EXISTS public.cricket_matches (
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
CREATE INDEX IF NOT EXISTS idx_cricket_matches_chat_id ON public.cricket_matches(chat_id);
CREATE INDEX IF NOT EXISTS idx_cricket_matches_host_id ON public.cricket_matches(host_id);
CREATE INDEX IF NOT EXISTS idx_cricket_matches_guest_id ON public.cricket_matches(guest_id);

-- Profiles Update for Cricket Custom Team Names
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_name TEXT;

-- Profiles Update for Cricket Starter Pack Claim
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS claimed_starter BOOLEAN DEFAULT FALSE;

-- Squad ordering for position-based squad management
ALTER TABLE public.user_owned_players ADD COLUMN IF NOT EXISTS squad_order INT DEFAULT 0;
