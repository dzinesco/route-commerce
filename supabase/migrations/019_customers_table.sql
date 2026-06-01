-- =============================================================================
-- V1.2 Stage 1 — Canonical Customers Table
-- Fully idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS
-- Purely additive: no changes to orders, communication_contacts, or checkout
--
-- STAGE 2 NOTE: When upserting customers in Stage 2, normalize BEFORE upsert:
--   - email: lowercase + trim
--   - phone: strip formatting chars [\s\-().[\]], preserve original if uncertain
-- This ensures consistent matching across orders, imports, and contacts.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.customers (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  primary_email   TEXT,
  primary_phone   TEXT,
  first_name      TEXT,
  last_name       TEXT,
  source          TEXT        NOT NULL DEFAULT 'system',
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customers_email_or_phone CHECK (
    primary_email IS NOT NULL OR primary_phone IS NOT NULL
  )
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_customers_brand
  ON public.customers(brand_id);
CREATE INDEX IF NOT EXISTS idx_customers_email
  ON public.customers(primary_email) WHERE primary_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone
  ON public.customers(primary_phone) WHERE primary_phone IS NOT NULL;

-- Partial unique indexes: enforce one customer per brand per email/phone
-- PostgreSQL requires CREATE UNIQUE INDEX rather than CONSTRAINT for partial unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_brand_email_unique
  ON public.customers(brand_id, primary_email)
  WHERE primary_email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_brand_phone_unique
  ON public.customers(brand_id, primary_phone)
  WHERE primary_phone IS NOT NULL;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brand admin can read customers"
  ON public.customers;
CREATE POLICY "Brand admin can read customers"
  ON public.customers FOR SELECT TO authenticated
  USING (brand_id IN (
    SELECT brand_id FROM admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.role = 'brand_admin'
  ));

DROP POLICY IF EXISTS "Platform admin can read customers"
  ON public.customers;
CREATE POLICY "Platform admin can read customers"
  ON public.customers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.role = 'platform_admin'
  ));

NOTIFY pgrst, 'reload schema';
