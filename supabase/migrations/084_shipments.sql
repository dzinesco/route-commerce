-- Migration 084: FedEx Shipments Table
-- Stores created FedEx shipment records with label URL, tracking, and special services.

CREATE TABLE IF NOT EXISTS public.shipments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                 UUID NOT NULL REFERENCES orders ON DELETE CASCADE,

  -- Carrier details
  carrier                  TEXT NOT NULL DEFAULT 'fedex',
  service_type             TEXT NOT NULL,          -- FEDEX_OVERNIGHT, FEDEX_2_DAY_AIR, FEDEX_GROUND, etc.
  tracking_number          TEXT,
  label_url                TEXT,                   -- FedEx label PDF URL
  rate_charged             NUMERIC(10, 2),        -- Actual rate charged by FedEx (cents)

  -- Delivery estimates
  estimated_delivery_date  DATE,

  -- Special handling applied
  is_refrigerated         BOOLEAN NOT NULL DEFAULT FALSE,
  is_fragile               BOOLEAN NOT NULL DEFAULT FALSE,
  handling_notes           TEXT,                  -- Custom per-shipment notes

  -- Status
  status                   TEXT NOT NULL DEFAULT 'created', -- created | label_voided | cancelled
  fedex_shipment_id        TEXT,                  -- FedEx internal shipment ID (for voiding)

  -- Audit
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by               UUID REFERENCES admin_users(user_id)
);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Shipments visible to brand admins and platform admins for the order's brand
CREATE POLICY brand_admin_view_shipments ON public.shipments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = shipments.order_id
        AND o.brand_id = (
          SELECT brand_id FROM admin_users WHERE user_id = auth.uid() LIMIT 1
        )
    )
    OR EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'platform_admin'
    )
  );

CREATE POLICY brand_admin_manage_shipments ON public.shipments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = shipments.order_id
        AND o.brand_id = (
          SELECT brand_id FROM admin_users WHERE user_id = auth.uid() LIMIT 1
        )
        AND EXISTS (
          SELECT 1 FROM admin_users au
          WHERE au.user_id = auth.uid()
            AND au.brand_id = o.brand_id
            AND au.role IN ('brand_admin', 'platform_admin')
        )
    )
  );

CREATE INDEX IF NOT EXISTS shipments_order_idx         ON public.shipments (order_id);
CREATE INDEX IF NOT EXISTS shipments_tracking_idx     ON public.shipments (tracking_number);
CREATE INDEX IF NOT EXISTS shipments_status_idx       ON public.shipments (status);