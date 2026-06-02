-- Launch Checklist Progress Table
-- Track user's launch preparation progress

CREATE TABLE IF NOT EXISTS launch_checklist_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_checklist_user ON launch_checklist_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_completed ON launch_checklist_progress(completed) WHERE completed = TRUE;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON launch_checklist_progress TO authenticated;
GRANT ALL ON launch_checklist_progress TO service_role;