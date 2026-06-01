-- 110_rls_zero_policy_tables.sql
-- Tables with RLS enabled but 0 policies — these allow ALL authenticated
-- users unrestricted access to all rows. We add brand-scoped policies.
--
-- Also includes brand_features which is referenced by the feature-flag
-- system and the ADDON_CATALOG gating.
--
-- All writes go through SECURITY DEFINER RPCs (bypass RLS). These policies
-- are defence-in-depth for direct table access only.

BEGIN;

-- ── brand_features ────────────────────────────────────────────────────────────
-- brand_features has no policies — any authenticated user can read/modify
-- any brand's feature flags. This is a security critical gap because
-- feature flags control paid add-ons and access to modules.

ALTER TABLE public.brand_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_features_platform_admin_all" ON public.brand_features;
DROP POLICY IF EXISTS "brand_features_brand_scoped" ON public.brand_features;

-- Platform admins: full access
CREATE POLICY "brand_features_platform_admin_all" ON public.brand_features
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

-- Brand admins/staff: only their brand's feature rows
CREATE POLICY "brand_features_brand_scoped" ON public.brand_features
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

-- ── communication_segments ───────────────────────────────────────────────────
-- Audience segments for Harvest Reach campaigns.

ALTER TABLE public.communication_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "communication_segments_platform_admin_all" ON public.communication_segments;
DROP POLICY IF EXISTS "communication_segments_brand_scoped" ON public.communication_segments;

CREATE POLICY "communication_segments_platform_admin_all" ON public.communication_segments
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

CREATE POLICY "communication_segments_brand_scoped" ON public.communication_segments
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

-- ── messages ──────────────────────────────────────────────────────────────────
-- Stop-level broadcast messages. 0 policies = any user can read/write all.

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_platform_admin_all" ON public.messages;
DROP POLICY IF EXISTS "messages_brand_scoped" ON public.messages;

CREATE POLICY "messages_platform_admin_all" ON public.messages
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

-- Scoped via stop → brand relationship
CREATE POLICY "messages_brand_scoped" ON public.messages
  FOR ALL TO authenticated
  USING (
    stop_id IN (
      SELECT s.id FROM public.stops s
      WHERE s.brand_id = (
        SELECT brand_id FROM public.admin_users
        WHERE user_id = auth.uid() AND active = true
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    stop_id IN (
      SELECT s.id FROM public.stops s
      WHERE s.brand_id = (
        SELECT brand_id FROM public.admin_users
        WHERE user_id = auth.uid() AND active = true
        LIMIT 1
      )
    )
  );

-- ── message_recipients ────────────────────────────────────────────────────────
-- Recipients for broadcast messages. Also 0 policies.

ALTER TABLE public.message_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_recipients_platform_admin_all" ON public.message_recipients;
DROP POLICY IF EXISTS "message_recipients_brand_scoped" ON public.message_recipients;

CREATE POLICY "message_recipients_platform_admin_all" ON public.message_recipients
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

CREATE POLICY "message_recipients_brand_scoped" ON public.message_recipients
  FOR ALL TO authenticated
  USING (
    message_id IN (
      SELECT m.id FROM public.messages m
      WHERE m.stop_id IN (
        SELECT s.id FROM public.stops s
        WHERE s.brand_id = (
          SELECT brand_id FROM public.admin_users
          WHERE user_id = auth.uid() AND active = true
          LIMIT 1
        )
      )
    )
  )
  WITH CHECK (
    message_id IN (
      SELECT m.id FROM public.messages m
      WHERE m.stop_id IN (
        SELECT s.id FROM public.stops s
        WHERE s.brand_id = (
          SELECT brand_id FROM public.admin_users
          WHERE user_id = auth.uid() AND active = true
          LIMIT 1
        )
      )
    )
  );

-- ── stop_products ─────────────────────────────────────────────────────────────
-- Junction table for products assigned to stops. 0 policies.

ALTER TABLE public.stop_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stop_products_platform_admin_all" ON public.stop_products;
DROP POLICY IF EXISTS "stop_products_brand_scoped" ON public.stop_products;

CREATE POLICY "stop_products_platform_admin_all" ON public.stop_products
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

-- Scoped via stop → brand
CREATE POLICY "stop_products_brand_scoped" ON public.stop_products
  FOR ALL TO authenticated
  USING (
    stop_id IN (
      SELECT s.id FROM public.stops s
      WHERE s.brand_id = (
        SELECT brand_id FROM public.admin_users
        WHERE user_id = auth.uid() AND active = true
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    stop_id IN (
      SELECT s.id FROM public.stops s
      WHERE s.brand_id = (
        SELECT brand_id FROM public.admin_users
        WHERE user_id = auth.uid() AND active = true
        LIMIT 1
      )
    )
  );

-- ── square_sync_queue ──────────────────────────────────────────────────────────
-- Internal queue for Square sync operations. Brand-scoped.

ALTER TABLE public.square_sync_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "square_sync_queue_platform_admin_all" ON public.square_sync_queue;
DROP POLICY IF EXISTS "square_sync_queue_brand_scoped" ON public.square_sync_queue;

CREATE POLICY "square_sync_queue_platform_admin_all" ON public.square_sync_queue
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

CREATE POLICY "square_sync_queue_brand_scoped" ON public.square_sync_queue
  FOR ALL TO authenticated
  USING (brand_id = (
    SELECT brand_id FROM public.admin_users
    WHERE user_id = auth.uid() AND active = true
    LIMIT 1
  ))
  WITH CHECK (brand_id = (
    SELECT brand_id FROM public.admin_users
    WHERE user_id = auth.uid() AND active = true
    LIMIT 1
  ));

COMMIT;