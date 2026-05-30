-- Hilo Games Persistence
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles Update for Daily Rewards
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_daily TIMESTAMPTZ;
