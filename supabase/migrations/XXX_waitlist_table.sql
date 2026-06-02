-- Waitlist and Early Access Signup System
-- Migration for Route Commerce

CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    referral_source TEXT,
    referred_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'archived'))
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist(created_at DESC);

-- Grant permissions
GRANT SELECT, INSERT ON waitlist TO anon;
GRANT SELECT, INSERT ON waitlist TO authenticated;
GRANT SELECT, INSERT ON waitlist TO service_role;

-- Comment on table
COMMENT ON TABLE waitlist IS 'Early access signup for Route Commerce platform';
COMMENT ON COLUMN waitlist.email IS 'Unique email address';
COMMENT ON COLUMN waitlist.name IS 'Optional full name';
COMMENT ON COLUMN waitlist.referral_source IS 'How they heard about us';
COMMENT ON COLUMN waitlist.referred_by IS 'Email of person who referred them';
COMMENT ON COLUMN waitlist.status IS 'pending, converted (signed up), archived';