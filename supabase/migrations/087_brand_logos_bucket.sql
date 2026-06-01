-- Migration 087: Brand Logos Storage Bucket
--
-- SETUP REQUIRED (one-time, run manually in Supabase dashboard):
--   1. Go to Storage → New bucket
--   2. Name: "brand-logos" | Public: true
--   3. Allowed MIME types: image/png, image/jpeg, image/webp, image/svg+xml
--   4. Max file size: 5MB
--
-- Files stored at: brand-logos/{brand_id}/logo.png, brand-logos/{brand_id}/logo-dark.png

-- RLS policies for brand-logos bucket
-- Brand admins can upload/update their own brand's logos
-- Everyone can read logos (public bucket)

CREATE POLICY IF NOT EXISTS "brand_admin_upload_logo"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'brand-logos'
  AND (
    -- Platform admin can upload to any brand
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid() AND au.role = 'platform_admin'
    )
    OR
    -- Brand admin can upload to their own brand's folder
    (storage.foldername(name))[1] IN (
      SELECT au.brand_id::text FROM admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'brand_admin'
    )
  )
);

CREATE POLICY IF NOT EXISTS "public_read_logo"
ON storage.objects
FOR SELECT
USING (bucket_id = 'brand-logos');

CREATE POLICY IF NOT EXISTS "brand_admin_update_logo"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'brand-logos'
  AND (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid() AND au.role = 'platform_admin'
    )
    OR
    (storage.foldername(name))[1] IN (
      SELECT au.brand_id::text FROM admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'brand_admin'
    )
  )
);

CREATE POLICY IF NOT EXISTS "brand_admin_delete_logo"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'brand-logos'
  AND (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid() AND au.role = 'platform_admin'
    )
    OR
    (storage.foldername(name))[1] IN (
      SELECT au.brand_id::text FROM admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'brand_admin'
    )
  )
);