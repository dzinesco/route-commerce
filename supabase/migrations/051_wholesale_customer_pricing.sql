-- Migration 051: Customer-Specific Pricing Overrides
-- Allows admin to set custom per-customer per-product prices
-- that override the standard product price tiers.

BEGIN;

-- ── 1. Wholesale Customer Product Pricing table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wholesale_customer_product_pricing (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id         UUID        NOT NULL REFERENCES wholesale_customers(id) ON DELETE CASCADE,
  product_id          UUID        NOT NULL REFERENCES wholesale_products(id) ON DELETE CASCADE,
  custom_unit_price   NUMERIC(10,2) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, product_id)
);

ALTER TABLE public.wholesale_customer_product_pricing ENABLE ROW LEVEL SECURITY;

-- Admins can manage overrides
DROP POLICY IF EXISTS "brand_admin_manage_pricing_overrides" ON wholesale_customer_product_pricing;
CREATE POLICY "brand_admin_manage_pricing_overrides" ON wholesale_customer_product_pricing
  FOR ALL USING (
    current_setting('app.settings.role', true)::TEXT IN ('brand_admin', 'platform_admin')
  );

-- ── 2. RPC: Get all pricing overrides for a customer ─────────────────────────
DROP FUNCTION IF EXISTS public.get_wholesale_customer_pricing(UUID);
CREATE OR REPLACE FUNCTION public.get_wholesale_customer_pricing(p_customer_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'product_id', wcpp.product_id,
    'custom_unit_price', wcpp.custom_unit_price,
    'product_name', wp.name
  )) INTO v_result
  FROM wholesale_customer_product_pricing wcpp
  JOIN wholesale_products wp ON wp.id = wcpp.product_id
  WHERE wcpp.customer_id = p_customer_id;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ── 3. RPC: Upsert a single pricing override ─────────────────────────────────
DROP FUNCTION IF EXISTS public.upsert_wholesale_customer_pricing(UUID, UUID, NUMERIC);
CREATE OR REPLACE FUNCTION public.upsert_wholesale_customer_pricing(
  p_customer_id       UUID DEFAULT NULL,
  p_product_id        UUID DEFAULT NULL,
  p_custom_unit_price NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO wholesale_customer_product_pricing (customer_id, product_id, custom_unit_price)
  VALUES (p_customer_id, p_product_id, p_custom_unit_price)
  ON CONFLICT (customer_id, product_id) DO UPDATE SET
    custom_unit_price = p_custom_unit_price,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- ── 4. RPC: Delete a pricing override ─────────────────────────────────────────
DROP FUNCTION IF EXISTS public.delete_wholesale_customer_pricing(UUID, UUID);
CREATE OR REPLACE FUNCTION public.delete_wholesale_customer_pricing(
  p_customer_id UUID DEFAULT NULL,
  p_product_id  UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM wholesale_customer_product_pricing
  WHERE customer_id = p_customer_id AND product_id = p_product_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
