-- Create product-images bucket for product images (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'product-images', 'product-images', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'product-images' OR name = 'product-images'
);

-- Enable public access to product-images bucket (re-runnable)
DROP POLICY IF EXISTS "Public can view product-images" ON storage.objects;
CREATE POLICY "Public can view product-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admins can upload product-images" ON storage.objects;
CREATE POLICY "Admins can upload product-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');