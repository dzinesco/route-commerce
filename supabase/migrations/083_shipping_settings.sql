-- Migration 083: Shipping Settings + FedEx Credentials + Perishable Flag on Products
-- Stores FedEx API credentials and perishable handling preferences per brand.

CREATE TABLE IF NOT EXISTS public.shipping_settings (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id                   UUID REFERENCES brands ON DELETE CASCADE,
  carrier                    TEXT NOT NULL DEFAULT 'fedex',

  -- FedEx credentials
  fedex_account_number       TEXT,
  fedex_api_key              TEXT,
  fedex_api_secret           TEXT,
  fedex_use_production       BOOLEAN NOT NULL DEFAULT FALSE,

  -- Default service type for non-perishable orders
  default_service_type       TEXT NOT NULL DEFAULT 'FEDEX_GROUND',

  -- Handling instructions for perishable goods (sweet corn, onions, etc.)
  refrigerated_handling_notes TEXT,
  fragile_handling_notes      TEXT,

  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One settings row per brand
CREATE UNIQUE INDEX IF NOT EXISTS shipping_settings_brand_idx
  ON public.shipping_settings (brand_id)
  WHERE brand_id IS NOT NULL;

ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;

-- Brand admins manage their own settings; platform admins manage all
CREATE POLICY brand_admin_manage_shipping_settings ON public.shipping_settings
  FOR ALL
  USING (
    brand_id IS NOT NULL
    AND auth.uid() IN (
      SELECT user_id FROM admin_users
      WHERE brand_id = shipping_settings.brand_id
        AND role IN ('brand_admin', 'platform_admin')
    )
  );

-- Platform admin global settings row (brand_id = NULL)
CREATE POLICY platform_admin_manage_global_shipping_settings ON public.shipping_settings
  FOR ALL
  USING (
    brand_id IS NULL
    AND auth.uid() IN (
      SELECT user_id FROM admin_users
      WHERE role = 'platform_admin'
    )
  );

-- ── Add is_perishable to products ─────────────────────────────────────────
-- Flags a product as perishable (sweet corn, onions, etc.)
-- Perishable orders can ONLY ship via OVERNIGHT or 2DAY air.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_perishable BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN products.is_perishable IS
  'If true, this product can only ship via FEDEX_OVERNIGHT or FEDEX_2_DAY_AIR. Affects FedEx rate filtering.';

-- ── RPC: get_order_items_perishable ────────────────────────────────────────
-- Returns true if ALL ship-able items in an order are perishable.
-- Used by FedEx rate filtering logic.

CREATE OR REPLACE FUNCTION public.get_order_items_perishable(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_has_shipping_items  BOOLEAN;
  v_all_perishable      BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id AND oi.fulfillment = 'ship'
  ) INTO v_has_shipping_items;

  IF NOT v_has_shipping_items THEN
    RETURN jsonb_build_object('is_perishable', false);
  END IF;

  SELECT NOT EXISTS (
    SELECT 1 FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
      AND oi.fulfillment = 'ship'
      AND COALESCE(p.is_perishable, false) = FALSE
  ) INTO v_all_perishable;

  RETURN jsonb_build_object('is_perishable', v_all_perishable);
END;
$$;