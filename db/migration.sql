-- Hilo Games Persistence
--
-- This migration may be run directly in a fresh Supabase project. Create the
-- base profiles table before adding feature-specific columns so ALTER TABLE
-- statements do not fail when public.profiles has not been created yet.
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id BIGINT PRIMARY KEY,
    first_name TEXT,
    wins INT NOT NULL DEFAULT 0,
    matches_played INT NOT NULL DEFAULT 0,
    coins INT NOT NULL DEFAULT 2000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hilo_games (
    user_id BIGINT PRIMARY KEY,
    bet_amount INT NOT NULL,
    multiplier FLOAT DEFAULT 1.0,
    current_player JSONB,
    next_player JSONB,
    constraint_name TEXT,
    seen_players JSONB DEFAULT '[]',
    message_id BIGINT,
    chat_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles Update for Daily Rewards
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_daily TIMESTAMPTZ;
