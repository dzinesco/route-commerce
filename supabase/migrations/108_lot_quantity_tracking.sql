-- 108_lot_quantity_tracking.sql
-- Add quantity_used_lbs tracking to harvest_lots + wire get_lot_orders + mark_lot_used_in_order

ALTER TABLE harvest_lots ADD COLUMN IF NOT EXISTS quantity_used_lbs NUMERIC(12,2) DEFAULT 0 NOT NULL;

DROP FUNCTION IF EXISTS public.get_lot_orders(uuid);
DROP FUNCTION IF EXISTS public.mark_lot_used_in_order(uuid, uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.get_lot_orders(p_lot_id uuid)
RETURNS TABLE(
  id uuid,
  customer_name text,
  order_date text,
  stop_name text,
  item_quantity numeric,
  item_notes text,
  fulfillment text,
  lot_quantity_used numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    COALESCE(c.name, c.email) as customer_name,
    TO_CHAR(o.created_at, 'MM/DD/YYYY') as order_date,
    s.name as stop_name,
    oi.quantity::NUMERIC as item_quantity,
    oi.notes as item_notes,
    oi.fulfillment,
    oi.quantity::NUMERIC as lot_quantity_used
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  LEFT JOIN customers c ON c.id = o.customer_id
  LEFT JOIN stops s ON s.id = o.stop_id
  WHERE oi.lot_id = p_lot_id
     OR oi.lot_number = (SELECT lot_number FROM harvest_lots WHERE id = p_lot_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_lot_used_in_order(
  p_lot_id uuid,
  p_order_id uuid,
  p_quantity_to_add numeric DEFAULT NULL,
  p_notes text DEFAULT NULL::text,
  p_admin_id uuid DEFAULT NULL::uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_lot_number text;
  v_qty numeric;
BEGIN
  SELECT lot_number INTO v_lot_number FROM harvest_lots WHERE id = p_lot_id;

  IF p_quantity_to_add IS NOT NULL AND p_quantity_to_add > 0 THEN
    v_qty := p_quantity_to_add;
  ELSE
    SELECT COALESCE(SUM(oi.quantity), 0) INTO v_qty
    FROM order_items oi
    WHERE oi.lot_id = p_lot_id OR oi.lot_number = v_lot_number;
  END IF;

  UPDATE harvest_lots
  SET quantity_used_lbs = COALESCE(quantity_used_lbs, 0) + v_qty
  WHERE id = p_lot_id;

  INSERT INTO harvest_lot_events (lot_id, event_type, event_time, notes, created_by)
  VALUES (p_lot_id, 'marked_used', NOW(), p_notes, p_admin_id);

  RETURN TRUE;
END;
$function$;