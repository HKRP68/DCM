-- Add rating column to profiles table for fast leaderboard querying and real-time updates
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating INT DEFAULT 0;
