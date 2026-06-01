-- Migration 076: Add address, zip, cutoff_time to stops
-- Supports driver navigation (street address) and customer cutoff deadline

ALTER TABLE stops ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL;
ALTER TABLE stops ADD COLUMN IF NOT EXISTS zip TEXT DEFAULT NULL;
ALTER TABLE stops ADD COLUMN IF NOT EXISTS cutoff_time TIMESTAMPTZ DEFAULT NULL;
