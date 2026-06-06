-- Base Neon/Postgres schema for DCM bot persistence.
-- Run this before the existing catalog/migration SQL files on a fresh Neon database.

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

CREATE TABLE IF NOT EXISTS user_owned_players (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    player_id TEXT NOT NULL,
    sport TEXT NOT NULL DEFAULT 'cricket',
    squad_order INT NOT NULL DEFAULT 0,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_owned_players_unique_player
    ON user_owned_players(user_id, player_id, sport);
CREATE INDEX IF NOT EXISTS idx_user_owned_players_user_sport
    ON user_owned_players(user_id, sport);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles(rating DESC, wins DESC, coins DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_wins ON profiles(wins DESC, rating DESC, coins DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_coins ON profiles(coins DESC, wins DESC, rating DESC);
CREATE INDEX IF NOT EXISTS idx_group_stats_chat_wins ON group_stats(chat_id, wins DESC);
