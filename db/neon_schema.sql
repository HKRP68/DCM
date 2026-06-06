-- Complete Neon/Postgres schema for DCM bot persistence.
-- Run this first on a fresh Neon database. It is also safe to rerun on an
-- existing database before applying/refreshing catalog seed data.

CREATE TABLE IF NOT EXISTS profiles (
    user_id BIGINT PRIMARY KEY,
    first_name TEXT DEFAULT 'User',
    wins INT NOT NULL DEFAULT 0,
    matches_played INT NOT NULL DEFAULT 0,
    coins BIGINT NOT NULL DEFAULT 2000,
    last_daily TIMESTAMPTZ,
    last_spin TIMESTAMPTZ,
    rating INT NOT NULL DEFAULT 0,
    team_name TEXT,
    claimed_starter BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT 'User';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wins INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matches_played INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coins BIGINT DEFAULT 2000;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_daily TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_spin TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS claimed_starter BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
UPDATE profiles
   SET first_name = COALESCE(first_name, 'User'),
       wins = COALESCE(wins, 0),
       matches_played = COALESCE(matches_played, 0),
       coins = COALESCE(coins, 2000),
       rating = COALESCE(rating, 0),
       claimed_starter = COALESCE(claimed_starter, FALSE),
       created_at = COALESCE(created_at, NOW());
ALTER TABLE profiles ALTER COLUMN first_name SET DEFAULT 'User';
ALTER TABLE profiles ALTER COLUMN wins SET DEFAULT 0;
ALTER TABLE profiles ALTER COLUMN matches_played SET DEFAULT 0;
ALTER TABLE profiles ALTER COLUMN coins SET DEFAULT 2000;
ALTER TABLE profiles ALTER COLUMN rating SET DEFAULT 0;
ALTER TABLE profiles ALTER COLUMN claimed_starter SET DEFAULT FALSE;
ALTER TABLE profiles ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE profiles ALTER COLUMN wins SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN matches_played SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN coins SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN rating SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN claimed_starter SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN created_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS group_stats (
    user_id BIGINT NOT NULL,
    chat_id BIGINT NOT NULL,
    first_name TEXT DEFAULT 'User',
    wins INT NOT NULL DEFAULT 0,
    matches_played INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, chat_id)
);

CREATE TABLE IF NOT EXISTS bonus_claims (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_settings (
    chat_id BIGINT PRIMARY KEY,
    discussion_time INT NOT NULL DEFAULT 90,
    voting_time INT NOT NULL DEFAULT 60,
    impostor_guess_time INT NOT NULL DEFAULT 30,
    clue_words INT NOT NULL DEFAULT 1,
    anonymous_voting BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_rewards (
    chat_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    amount BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hilo_games (
    user_id BIGINT PRIMARY KEY,
    bet_amount INT NOT NULL,
    multiplier FLOAT DEFAULT 1.0,
    current_player JSONB,
    next_player JSONB,
    constraint_name TEXT,
    seen_players JSONB DEFAULT '[]',
    message_id BIGINT,
    chat_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cricketplayers (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT,
    role TEXT,
    batting_rating INTEGER,
    bowling_rating INTEGER,
    ovr INTEGER,
    bowler_type TEXT,
    buy_price BIGINT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    tier TEXT,
    batting_archetype TEXT,
    bowling_archetype TEXT
);

CREATE TABLE IF NOT EXISTS user_owned_players (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    player_id TEXT NOT NULL,
    sport TEXT NOT NULL DEFAULT 'cricket',
    squad_order INT NOT NULL DEFAULT 0,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_owned_players ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE user_owned_players ADD COLUMN IF NOT EXISTS player_id TEXT;
ALTER TABLE user_owned_players ADD COLUMN IF NOT EXISTS sport TEXT DEFAULT 'cricket';
ALTER TABLE user_owned_players ADD COLUMN IF NOT EXISTS squad_order INT DEFAULT 0;
ALTER TABLE user_owned_players ADD COLUMN IF NOT EXISTS acquired_at TIMESTAMPTZ DEFAULT NOW();
UPDATE user_owned_players
   SET sport = COALESCE(sport, 'cricket'),
       squad_order = COALESCE(squad_order, 0),
       acquired_at = COALESCE(acquired_at, NOW());
ALTER TABLE user_owned_players ALTER COLUMN sport SET DEFAULT 'cricket';
ALTER TABLE user_owned_players ALTER COLUMN squad_order SET DEFAULT 0;
ALTER TABLE user_owned_players ALTER COLUMN acquired_at SET DEFAULT NOW();
ALTER TABLE user_owned_players ALTER COLUMN sport SET NOT NULL;
ALTER TABLE user_owned_players ALTER COLUMN squad_order SET NOT NULL;
ALTER TABLE user_owned_players ALTER COLUMN acquired_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS cricket_matches (
    id TEXT PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    host_id BIGINT NOT NULL,
    guest_id BIGINT,
    status TEXT NOT NULL,
    state_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'i'
          AND c.relname = 'idx_user_owned_players_unique_player'
          AND n.nspname = 'public'
    ) AND NOT EXISTS (
        SELECT 1
          FROM user_owned_players
         WHERE user_id IS NOT NULL AND player_id IS NOT NULL AND sport IS NOT NULL
         GROUP BY user_id, player_id, sport
        HAVING COUNT(*) > 1
    ) THEN
        CREATE UNIQUE INDEX idx_user_owned_players_unique_player
            ON user_owned_players(user_id, player_id, sport);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_user_owned_players_user_sport
    ON user_owned_players(user_id, sport);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles(rating DESC, wins DESC, coins DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_wins ON profiles(wins DESC, rating DESC, coins DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_coins ON profiles(coins DESC, wins DESC, rating DESC);
CREATE INDEX IF NOT EXISTS idx_group_stats_chat_wins ON group_stats(chat_id, wins DESC);
CREATE INDEX IF NOT EXISTS idx_cricket_matches_chat_id ON cricket_matches(chat_id);
CREATE INDEX IF NOT EXISTS idx_cricket_matches_host_id ON cricket_matches(host_id);
CREATE INDEX IF NOT EXISTS idx_cricket_matches_guest_id ON cricket_matches(guest_id);
