-- =============================================================================
-- Water Log V1.6 - Seed Water Admin User
-- =============================================================================

INSERT INTO public.water_users (brand_id, name, pin_hash, role, active, language_preference)
VALUES (
  '64294306-5f42-463d-a5e8-2ad6c81a96de',
  'Test Water Admin',
  extensions.crypt('1234', gen_salt('bf')),
  'water_admin',
  true,
  'en'
);