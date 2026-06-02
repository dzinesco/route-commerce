-- Blog and Newsletter Tables
-- Migration for Route Commerce

CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT,
    featured_image TEXT,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    category TEXT DEFAULT 'General',
    tags TEXT[],
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS blog_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'guide' CHECK (type IN ('guide', 'case_study', 'webinar', 'template', 'checklist')),
    url TEXT,
    thumbnail TEXT,
    downloads INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
    source TEXT,
    unsubscribed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(published);
CREATE INDEX IF NOT EXISTS idx_blog_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);

-- Grant permissions
GRANT SELECT, INSERT ON blog_posts TO anon;
GRANT SELECT, INSERT ON blog_resources TO anon;
GRANT SELECT, INSERT ON newsletter_subscribers TO anon;
GRANT ALL ON blog_posts TO authenticated;
GRANT ALL ON blog_resources TO authenticated;
GRANT ALL ON newsletter_subscribers TO authenticated;
GRANT ALL ON blog_posts TO service_role;
GRANT ALL ON blog_resources TO service_role;
GRANT ALL ON newsletter_subscribers TO service_role;

-- Seed blog posts
INSERT INTO blog_posts (slug, title, excerpt, content, author_name, category, published_at, published) VALUES
    ('getting-started-with-route-commerce', 'Getting Started with Route Commerce', 'Learn how to set up your wholesale business on Route Commerce in under 10 minutes.', '## Getting Started

Welcome to Route Commerce! This guide will walk you through setting up your wholesale operation...', 'Team Route Commerce', 'Guides', NOW(), TRUE),
    ('maximize-produce-profitability', '5 Tips to Maximize Your Produce Profitability', 'Strategic pricing and inventory management can significantly boost your bottom line.', '## Introduction

Running a profitable produce operation requires more than just quality products...', 'Sarah Johnson', 'Tips', NOW(), TRUE),
    ('customer-communication-best-practices', 'Best Practices for Customer Communication', 'Keep your customers informed and engaged with these communication strategies.', '## Why Communication Matters

Clear, timely communication builds trust and reduces missed pickups...', 'Marcus Chen', 'Marketing', NOW(), TRUE)
ON CONFLICT DO NOTHING;

-- Seed resources
INSERT INTO blog_resources (title, description, type, downloads, featured) VALUES
    ('Wholesale Pricing Guide', 'Complete guide to setting profitable wholesale prices', 'guide', 342, TRUE),
    ('Order Management Checklist', 'Step-by-step checklist for order fulfillment', 'checklist', 256, FALSE),
    ('Customer Email Templates', 'Pre-written email templates for common scenarios', 'template', 189, FALSE)
ON CONFLICT DO NOTHING;