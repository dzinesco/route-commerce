-- Migration 207: Multi-Brand Admin Support
--
-- Adds:
--   1. New role: 'multi_brand_admin' (functionally equivalent to brand_admin,
--      but disambiguates intent: "manages 2+ brands" vs "manages 1 brand").
--   2. Junction table: admin_user_brands — replaces the single brand_id
--      implicit invariant. The legacy admin_users.brand_id column is kept
--      for backwards compatibility (see migration 220_*.sql to drop it later).
--   3. RPCs: add_admin_user_brand / remove_admin_user_brand (manages the
--      junction and auto-promotes/demotes the role based on brand count).
--
-- Design:
--   - Composite PK (admin_user_id, brand_id) enforces uniqueness.
--   - Index on brand_id makes "which admins are in Brand X?" queries fast.
--   - ON DELETE CASCADE for both FKs — deleting an admin or brand cleans up.
--   - added_by is nullable so first-insert rows (admin with no other admin)
--     can still insert their own membership.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Update role CHECK constraint to include multi_brand_admin
-- ═══════════════════════════════════════════════════════════════════════════
-- The constraint name in Supabase's auto-generated schema is conventionally
-- "admin_users_role_check" (the default Postgres naming), but we drop both
-- the canonical and a common alternative to be safe across schema generations.

ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS admin_users_role_chk;

ALTER TABLE public.admin_users
  ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('platform_admin', 'brand_admin', 'multi_brand_admin', 'store_employee', 'staff'));

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Create admin_user_brands junction table
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_user_brands (
  admin_user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  brand_id      UUID NOT NULL REFERENCES public.brands(id)     ON DELETE CASCADE,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by      UUID REFERENCES public.admin_users(id),
  PRIMARY KEY (admin_user_id, brand_id)
);

CREATE INDEX IF NOT EXISTS admin_user_brands_brand_id_idx
  ON public.admin_user_brands(brand_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Backfill: copy legacy single-brand admins into the junction
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.admin_user_brands (admin_user_id, brand_id)
SELECT id, brand_id FROM public.admin_users
WHERE brand_id IS NOT NULL
ON CONFLICT (admin_user_id, brand_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Promote anyone with > 1 brand in the junction to multi_brand_admin
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE public.admin_users
SET role = 'multi_brand_admin'
WHERE role = 'brand_admin'
  AND id IN (
    SELECT admin_user_id FROM public.admin_user_brands
    GROUP BY admin_user_id HAVING COUNT(*) > 1
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. RLS: enable on the junction (no public read; only platform_admin all)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.admin_user_brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_user_brands_platform_admin_all" ON public.admin_user_brands;
CREATE POLICY "admin_user_brands_platform_admin_all" ON public.admin_user_brands
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

-- Brand admins can read their own membership rows (so the BrandSelector
-- dropdown works without exposing other admins' memberships)
DROP POLICY IF EXISTS "admin_user_brands_self_read" ON public.admin_user_brands;
CREATE POLICY "admin_user_brands_self_read" ON public.admin_user_brands
  FOR SELECT TO authenticated
  USING (
    admin_user_id IN (
      SELECT id FROM public.admin_users
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. RPC: add_admin_user_brand
--    Adds an admin to a brand. Auto-promotes to multi_brand_admin if they
--    end up with 2+ brands.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.add_admin_user_brand(
  p_admin_user_id UUID,
  p_brand_id      UUID,
  p_added_by      UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_user_brands (admin_user_id, brand_id, added_by)
  VALUES (p_admin_user_id, p_brand_id, p_added_by)
  ON CONFLICT (admin_user_id, brand_id) DO NOTHING;

  -- Promote to multi_brand_admin if they now have 2+ brands
  UPDATE public.admin_users
  SET role = 'multi_brand_admin'
  WHERE id = p_admin_user_id
    AND role = 'brand_admin'
    AND (
      SELECT COUNT(*) FROM public.admin_user_brands
      WHERE admin_user_id = p_admin_user_id
    ) > 1;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. RPC: remove_admin_user_brand
--    Removes an admin from a brand. Auto-demotes to brand_admin if they
--    drop to 1 brand. Does NOT demote to anything else (e.g. staff) — only
--    brand_admin <-> multi_brand_admin transitions.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.remove_admin_user_brand(
  p_admin_user_id UUID,
  p_brand_id      UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining_count INT;
BEGIN
  DELETE FROM public.admin_user_brands
  WHERE admin_user_id = p_admin_user_id
    AND brand_id = p_brand_id;

  GET DIAGNOSTICS v_remaining_count = ROW_COUNT;

  -- If we just removed a row and the user is now down to 1 brand, demote
  IF v_remaining_count > 0 THEN
    SELECT COUNT(*) INTO v_remaining_count
    FROM public.admin_user_brands
    WHERE admin_user_id = p_admin_user_id;

    IF v_remaining_count = 1 THEN
      UPDATE public.admin_users
      SET role = 'brand_admin'
      WHERE id = p_admin_user_id
        AND role = 'multi_brand_admin';
    END IF;
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Refresh PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';
