-- 109_enable_rls_critical.sql  (v2)
-- Supabase flagged 3 tables with RLS disabled. This replaces earlier policies
-- that may have been created by Supabase's built-in RLS assistant.
--
-- Confirmed existing (legacy) policies dropped:
--   "Platform admins manage admin_users"     — no active=true check
--   "admin_users self read"                 — only self (user_id=auth.uid()), skips brand scope
--
-- Replacement policies:
--   admin_users_platform_admin_all  — platform_admin with active=true only
--   admin_users_brand_scoped        — brand scoped ALL (brand_admin/staff)
--   harvest_lots_platform_admin_all— platform_admin with active=true only
--   harvest_lots_brand_scoped      — brand scoped ALL
--   harvest_lot_events_platform_admin_all — platform_admin with active=true only
--   harvest_lot_events_brand_scoped     — events scoped via lot → harvest_lots

BEGIN;

-- ── admin_users ────────────────────────────────────────────────────────────────

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Drop legacy policies installed by Supabase assistant
DROP POLICY IF EXISTS "Platform admins manage admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users self read" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_platform_admin_all" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_brand_scoped" ON public.admin_users;

-- Platform admins: full access (active=true required)
CREATE POLICY "admin_users_platform_admin_all" ON public.admin_users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'platform_admin'
        AND au.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'platform_admin'
        AND au.active = true
    )
  );

-- Brand admins / staff: access only rows matching their brand
CREATE POLICY "admin_users_brand_scoped" ON public.admin_users
  FOR ALL TO authenticated
  USING (
    brand_id = (
      SELECT brand_id FROM public.admin_users
      WHERE user_id = auth.uid() AND active = true
      LIMIT 1
    )
  )
  WITH CHECK (
    brand_id = (
      SELECT brand_id FROM public.admin_users
      WHERE user_id = auth.uid() AND active = true
      LIMIT 1
    )
  );

-- ── harvest_lots ───────────────────────────────────────────────────────────────

ALTER TABLE public.harvest_lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "harvest_lots_platform_admin_all" ON public.harvest_lots;
DROP POLICY IF EXISTS "harvest_lots_brand_scoped" ON public.harvest_lots;

CREATE POLICY "harvest_lots_platform_admin_all" ON public.harvest_lots
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'platform_admin'
        AND au.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'platform_admin'
        AND au.active = true
    )
  );

CREATE POLICY "harvest_lots_brand_scoped" ON public.harvest_lots
  FOR ALL TO authenticated
  USING (
    brand_id = (
      SELECT brand_id FROM public.admin_users
      WHERE user_id = auth.uid() AND active = true
      LIMIT 1
    )
  )
  WITH CHECK (
    brand_id = (
      SELECT brand_id FROM public.admin_users
      WHERE user_id = auth.uid() AND active = true
      LIMIT 1
    )
  );

-- ── harvest_lot_events ────────────────────────────────────────────────────────

ALTER TABLE public.harvest_lot_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "harvest_lot_events_platform_admin_all" ON public.harvest_lot_events;
DROP POLICY IF EXISTS "harvest_lot_events_brand_scoped" ON public.harvest_lot_events;

CREATE POLICY "harvest_lot_events_platform_admin_all" ON public.harvest_lot_events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'platform_admin'
        AND au.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'platform_admin'
        AND au.active = true
    )
  );

-- Events are scoped to the lot via lot_id, so we check the lot's brand_id
CREATE POLICY "harvest_lot_events_brand_scoped" ON public.harvest_lot_events
  FOR ALL TO authenticated
  USING (
    lot_id IN (
      SELECT hl.id FROM public.harvest_lots hl
      WHERE hl.brand_id = (
        SELECT brand_id FROM public.admin_users
        WHERE user_id = auth.uid() AND active = true
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    lot_id IN (
      SELECT hl.id FROM public.harvest_lots hl
      WHERE hl.brand_id = (
        SELECT brand_id FROM public.admin_users
        WHERE user_id = auth.uid() AND active = true
        LIMIT 1
      )
    )
  );

COMMIT;