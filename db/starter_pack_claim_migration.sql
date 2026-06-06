-- Starter pack claim compatibility migration.
-- Run this on existing databases where /claim reports that the starter pack
-- claim field is missing.

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS claimed_starter BOOLEAN DEFAULT FALSE;

UPDATE profiles
SET claimed_starter = FALSE
WHERE claimed_starter IS NULL;

ALTER TABLE profiles
    ALTER COLUMN claimed_starter SET DEFAULT FALSE;

ALTER TABLE profiles
    ALTER COLUMN claimed_starter SET NOT NULL;
