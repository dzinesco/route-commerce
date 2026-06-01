-- Migration 079: Add delivery/open/click analytics columns to communication_message_logs
-- Enables Resend webhook handler to update email engagement metrics

ALTER TABLE communication_message_logs
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bounce_reason TEXT;

-- Index for efficient delivery status queries
CREATE INDEX IF NOT EXISTS idx_message_logs_delivered_at
  ON communication_message_logs (delivered_at)
  WHERE delivered_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_message_logs_opened_at
  ON communication_message_logs (opened_at)
  WHERE opened_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_message_logs_clicked_at
  ON communication_message_logs (clicked_at)
  WHERE clicked_at IS NOT NULL;