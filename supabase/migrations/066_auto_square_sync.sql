-- Migration 066: Auto Square Sync — queue table, enqueue trigger, claim processor
-- Applies:  square_sync_queue table, enqueue_square_sync() RPC,
--           trg_wholesale_products_sync trigger, queue processor endpoint

BEGIN;

-- ── 1. Sync queue table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.square_sync_queue (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id    UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  sync_type   TEXT        NOT NULL DEFAULT 'products',
  status      TEXT        NOT NULL DEFAULT 'pending',
  enqueued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  retry_count INTEGER     NOT NULL DEFAULT 0,
  last_error  TEXT,
  CONSTRAINT square_sync_queue_status CHECK (status IN ('pending', 'processing', 'done', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_square_sync_queue_pending
  ON square_sync_queue(status, enqueued_at ASC)
  WHERE status = 'pending';

-- ── 2. enqueue_square_sync — idempotent, safe for trigger ─────────────────────
CREATE OR REPLACE FUNCTION public.enqueue_square_sync(
  p_brand_id  UUID,
  p_sync_type TEXT DEFAULT 'products'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM square_sync_queue
    WHERE brand_id = p_brand_id
      AND sync_type = p_sync_type
      AND status IN ('pending', 'processing')
  ) THEN
    INSERT INTO square_sync_queue (brand_id, sync_type, status)
    VALUES (p_brand_id, p_sync_type, 'pending');
  END IF;
END;
$$;

-- ── 3. claim_square_sync_queue — atomic claim + return ────────────────────────
-- Atomically claims the oldest pending entry for a brand, marks it 'processing',
-- and returns it so the processor can work on it.
CREATE OR REPLACE FUNCTION public.claim_square_sync_queue(p_brand_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_entry JSONB;
BEGIN
  -- Claim and update in one atomic operation
  WITH claimed AS (
    UPDATE square_sync_queue
    SET status = 'processing', processed_at = now()
    WHERE id = (
      SELECT id FROM square_sync_queue
      WHERE brand_id = p_brand_id
        AND status = 'pending'
      ORDER BY enqueued_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, brand_id, sync_type, status, enqueued_at
  )
  SELECT jsonb_build_object(
    'id', id,
    'brand_id', brand_id,
    'sync_type', sync_type,
    'status', status,
    'enqueued_at', enqueued_at
  ) INTO v_entry
  FROM claimed;

  RETURN COALESCE(v_entry, 'null'::JSONB);
END;
$$;

-- ── 4. Triggers on wholesale_products ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_wholesale_products_on_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.availability = 'available' THEN
      PERFORM enqueue_square_sync(NEW.brand_id, 'products');
    END IF;
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    IF OLD.availability = 'available' OR NEW.availability = 'available' THEN
      PERFORM enqueue_square_sync(NEW.brand_id, 'products');
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wholesale_products_sync ON wholesale_products;
CREATE TRIGGER trg_wholesale_products_sync
  AFTER INSERT OR UPDATE OF availability, name, description, price_tiers, unit_type, default_pickup_location
  ON wholesale_products
  FOR EACH ROW EXECUTE FUNCTION trg_wholesale_products_on_change();

CREATE OR REPLACE FUNCTION public.trg_wholesale_products_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM enqueue_square_sync(OLD.brand_id, 'products');
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_wholesale_products_sync_del ON wholesale_products;
CREATE TRIGGER trg_wholesale_products_sync_del
  AFTER DELETE ON wholesale_products
  FOR EACH ROW EXECUTE FUNCTION trg_wholesale_products_on_delete();

-- ── 5. Upsert payment_settings with square_last_sync_at ─────────────────────
-- Helper RPC to update last sync timestamp after a sync completes
CREATE OR REPLACE FUNCTION public.update_square_sync_timestamp(
  p_brand_id UUID,
  p_error    TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE payment_settings
  SET square_last_sync_at = now(),
      square_last_sync_error = p_error
  WHERE brand_id = p_brand_id;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';