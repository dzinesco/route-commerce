-- Migration 056: Wholesale Price Sheet Notification Type
-- Adds price_sheet to the wholesale_notification_type enum.

BEGIN;

ALTER TYPE wholesale_notification_type ADD VALUE IF NOT EXISTS 'price_sheet';

COMMIT;

NOTIFY pgrst, 'reload schema';
