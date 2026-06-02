-- Roadmap Tables for Feature Requests and Voting
-- Migration for Route Commerce

CREATE TABLE IF NOT EXISTS roadmap_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'shipped')),
    category TEXT,
    upvotes INTEGER DEFAULT 0,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roadmap_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES roadmap_items(id) ON DELETE CASCADE,
    visitor_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_id, visitor_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roadmap_status ON roadmap_items(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_category ON roadmap_items(category);
CREATE INDEX IF NOT EXISTS idx_roadmap_upvotes ON roadmap_items(upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_roadmap_votes_item ON roadmap_votes(item_id);

-- Grant permissions
GRANT SELECT ON roadmap_items TO anon;
GRANT SELECT, INSERT ON roadmap_votes TO anon;
GRANT ALL ON roadmap_items TO authenticated;
GRANT ALL ON roadmap_votes TO authenticated;
GRANT ALL ON roadmap_items TO service_role;
GRANT ALL ON roadmap_votes TO service_role;

-- Seed some initial items
INSERT INTO roadmap_items (title, description, status, category, upvotes) VALUES
    ('Mobile App (iOS & Android)', 'Native apps for field workers and delivery drivers', 'in_progress', 'Mobile', 234),
    ('SMS Campaigns', 'Text message marketing and notifications', 'planned', 'Communication', 98),
    ('Route Optimization', 'AI-powered route planning for deliveries', 'planned', 'Logistics', 167),
    ('Customer Loyalty Program', 'Points, rewards, and referral tracking', 'planned', 'Marketing', 112),
    ('POS Integration (Clover, Toast)', 'Additional POS system integrations', 'planned', 'Integrations', 76)
ON CONFLICT DO NOTHING;