-- Migration 126: founder_pain_log table and platform view

CREATE TABLE founder_pain_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT NOT NULL, -- e.g. 'deployment', 'payment', 'data', 'operations'
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE VIEW founder_pain_log_platform AS
SELECT
  fpl.id,
  fpl.brand_id,
  fpl.severity,
  fpl.category,
  fpl.title,
  fpl.description,
  fpl.status,
  fpl.created_at,
  fpl.resolved_at,
  fpl.resolved_by,
  b.name AS brand_name,
  b.slug AS brand_slug
FROM founder_pain_log fpl
LEFT JOIN brands b ON b.id = fpl.brand_id
ORDER BY
  CASE fpl.severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  fpl.created_at DESC;