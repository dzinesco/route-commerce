-- Migration 042: Product Import RPC + upsert_product
-- Idempotent: CREATE OR REPLACE FUNCTION

-- ── 1. upsert_product ─────────────────────────────────────────────────────────
-- Upserts a single product by name (within brand). Returns the product id.
-- Used by the CSV import tool to create or update products in bulk.

CREATE OR REPLACE FUNCTION public.upsert_product(
  p_brand_id    UUID,
  p_name        TEXT,
  p_price       NUMERIC,
  p_type        TEXT,
  p_description TEXT DEFAULT '',
  p_active      BOOLEAN DEFAULT true,
  p_image_url   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_product_id UUID;
  v_is_update  BOOLEAN := false;
BEGIN
  -- Check if product with same name exists in this brand
  SELECT id INTO v_product_id
  FROM products
  WHERE brand_id = p_brand_id AND name = p_name
  LIMIT 1;

  IF v_product_id IS NOT NULL THEN
    -- Update existing
    UPDATE products SET
      name        = p_name,
      description = p_description,
      price       = p_price,
      type        = p_type,
      active      = p_active,
      image_url   = COALESCE(p_image_url, image_url),
      updated_at  = now()
    WHERE id = v_product_id
    RETURNING id INTO v_product_id;
    v_is_update := true;
  ELSE
    -- Insert new
    INSERT INTO products (brand_id, name, description, price, type, active, image_url)
    VALUES (p_brand_id, p_name, p_description, p_price, p_type, p_active, p_image_url)
    RETURNING id INTO v_product_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_product_id,
    'is_update', v_is_update,
    'name', p_name
  );
END;
$$;

-- ── 2. bulk_upsert_products ──────────────────────────────────────────────────
-- Takes an array of product records and upserts them all within a brand.
-- Returns a summary: { created, updated, errors }.

CREATE OR REPLACE FUNCTION public.bulk_upsert_products(
  p_brand_id UUID,
  p_products JSONB  -- array of { name, description, price, type, active, image_url }
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_entry  JSONB;
  v_result JSONB := '{"created": 0, "updated": 0, "errors": []}'::JSONB;
  v_name   TEXT;
  v_desc   TEXT;
  v_price  NUMERIC;
  v_type   TEXT;
  v_active BOOLEAN;
  v_img    TEXT;
  v_was_new BOOLEAN;
BEGIN
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_products)
  LOOP
    BEGIN
      v_name   := nullif(v_entry->>'name', '');
      v_desc   := coalesce(nullif(v_entry->>'description', ''), '');
      v_price  := nullif((v_entry->>'price')::TEXT, '')::NUMERIC;
      v_type   := nullif(v_entry->>'type', '');
      v_active := coalesce((v_entry->>'active')::BOOLEAN, true);
      v_img    := nullif(v_entry->>'image_url', '');

      IF v_name IS NULL OR v_name = '' THEN
        RAISE EXCEPTION 'Product name is required';
      END IF;

      IF v_price IS NULL OR v_price < 0 THEN
        RAISE EXCEPTION 'Invalid price for product: %', v_name;
      END IF;

      IF v_type NOT IN ('Pickup', 'Shipping', 'Pickup & Shipping') THEN
        RAISE EXCEPTION 'Invalid type for product: %. Must be Pickup, Shipping, or Pickup & Shipping', v_name;
      END IF;

      v_was_new := NOT EXISTS (
        SELECT 1 FROM products WHERE brand_id = p_brand_id AND name = v_name
      );

      PERFORM upsert_product(p_brand_id, v_name, v_desc, v_price, v_type, v_active, v_img);

      IF v_was_new THEN
        v_result := jsonb_set(v_result, '{created}',
          to_jsonb((v_result->>'created')::INTEGER + 1));
      ELSE
        v_result := jsonb_set(v_result, '{updated}',
          to_jsonb((v_result->>'updated')::INTEGER + 1));
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_result := jsonb_set(
        v_result, '{errors}',
        v_result->'errors' || jsonb_build_array(
          jsonb_build_object('product', v_name, 'error', SQLERRM)
        )
      );
    END;
  END LOOP;

  RETURN v_result;
END;
$$;

NOTIFY pgrst, 'reload schema';
