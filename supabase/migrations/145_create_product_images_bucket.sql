-- Create product-images bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowedMimeTypes)
VALUES ('product-images', 'product-images', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Enable public access to product-images bucket
CREATE POLICY "Public can view product-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');