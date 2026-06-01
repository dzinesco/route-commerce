-- Migration 068: User carts table for server-side cart persistence
-- Enables cart merge on login and server-side cart for logged-in users.

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_carts (
  user_id    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  items      JSONB       NOT NULL DEFAULT '[]'::JSONB,
  -- Shape: [{ id, name, price, quantity, fulfillment, brand_id, brand_slug }]
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own cart; platform_admin can read all
CREATE POLICY "users_own_cart" ON public.user_carts
  FOR ALL USING (
    auth.uid() = user_id
    OR current_setting('app.settings.role', true)::TEXT = 'platform_admin'
  );

-- RPC: upsert_user_cart — insert or update the user's cart
-- p_user_id: optional override (platform_admin may pass to update another user's cart)
CREATE OR REPLACE FUNCTION public.upsert_user_cart(
  p_user_id   UUID,
  p_items     JSONB
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO user_carts (user_id, items, updated_at)
  VALUES (p_user_id, p_items, now())
  ON CONFLICT (user_id) DO UPDATE SET
    items = p_items,
    updated_at = now()
  RETURNING jsonb_build_object('success', true, 'user_id', user_id, 'item_count', jsonb_array_length(p_items));
END;
$$;

-- RPC: get_user_cart — fetch a user's cart
CREATE OR REPLACE FUNCTION public.get_user_cart(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_items JSONB;
BEGIN
  SELECT items INTO v_items FROM user_carts WHERE user_id = p_user_id;
  RETURN COALESCE(v_items, '[]'::JSONB);
END;
$$;

-- RPC: clear_user_cart
CREATE OR REPLACE FUNCTION public.clear_user_cart(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM user_carts WHERE user_id = p_user_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';