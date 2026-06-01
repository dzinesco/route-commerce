-- Migration 077: Add status column to stops
-- 'draft' = imported, awaiting review | 'active' = published

ALTER TABLE stops ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' NOT NULL;

-- Set existing stops to 'active'
UPDATE stops SET status = 'active' WHERE status IS NULL;

ALTER TABLE stops ALTER COLUMN status SET NOT NULL;
