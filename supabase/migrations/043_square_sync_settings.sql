-- Migration 043: Square Sync Settings
-- Adds Square Sync configuration columns to payment_settings

ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS square_sync_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS square_inventory_mode TEXT NOT NULL DEFAULT 'none';
-- Values: 'none' | 'rc_to_square' | 'square_to_rc' | 'bidirectional'
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS square_last_sync_at TIMESTAMPTZ;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS square_last_sync_error TEXT;

NOTIFY pgrst, 'reload schema';
