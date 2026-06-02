-- Seed data for production development and testing

BEGIN;

-- =============================================================================
-- DEMO BRANDS
-- =============================================================================

INSERT INTO brands (id, name, slug, plan_tier, max_users, max_stops_monthly, max_products, stripe_customer_id, created_at)
VALUES 
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sunrise Farms', 'sunrise-farms', 'enterprise', 10, 100, 500, 'cus_demo_sunrise', NOW()),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Green Valley Organics', 'green-valley', 'farm', 5, 50, 250, 'cus_demo_green', NOW()),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Orchard Fresh', 'orchard-fresh', 'starter', 2, 10, 50, 'cus_demo_orchard', NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DEMO PRODUCTS FOR SUNRISE FARMS
-- =============================================================================

INSERT INTO products (id, brand_id, name, description, price, unit, category, sku, is_active, is_taxable, image_url, created_at)
VALUES 
  ('p0010001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 
   'Honeycrisp Apples', 'Premium organic Honeycrisp apples, sweet and crisp', 3.99, 'lb', 'Apples', 'APP-HC-001', true, true, NULL, NOW()),
  ('p0010002-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Gala Apples', 'Sweet and mild Gala apples, perfect for snacking', 3.49, 'lb', 'Apples', 'APP-GA-001', true, true, NULL, NOW()),
  ('p0010003-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Valencia Oranges', 'Fresh Valencia oranges, great for juicing', 2.99, 'lb', 'Oranges', 'ORG-VA-001', true, true, NULL, NOW()),
  ('p0010004-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Navel Oranges', 'Seedless Navel oranges, sweet and easy to peel', 3.29, 'lb', 'Oranges', 'ORG-NA-001', true, true, NULL, NOW()),
  ('p0010005-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Ruby Red Grapefruit', 'Juicy Ruby Red grapefruit, perfectly balanced sweet-tart', 3.79, 'lb', 'Citrus', 'GRF-RR-001', true, true, NULL, NOW()),
  ('p0010006-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Pink Lady Apples', 'Crisp and sweet Pink Lady apples', 4.29, 'lb', 'Apples', 'APP-PL-001', true, true, NULL, NOW()),
  ('p0010007-0000-0000-0000-000000000007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Tangerines', 'Sweet and juicy tangerines, easy to peel', 4.49, 'lb', 'Citrus', 'CIT-TN-001', true, true, NULL, NOW()),
  ('p0010008-0000-0000-0000-000000000008', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Meyer Lemons', 'Fragrant Meyer lemons, sweeter than regular lemons', 4.99, 'lb', 'Lemons', 'LEM-ME-001', true, true, NULL, NOW()),
  ('p0010009-0000-0000-0000-000000000009', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Lime Mix Pack', 'Seasonal mix of Persian and Key limes', 5.99, 'lb', 'Lemons', 'LIM-MX-001', true, true, NULL, NOW()),
  ('p0010010-0000-0000-0000-000000000010', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Mixed Citrus Box', 'Seasonal assortment of 5+ citrus varieties, 20lb box', 54.99, 'box', 'Boxes', 'BOX-MC-001', true, true, NULL, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DEMO STOPS FOR SUNRISE FARMS
-- =============================================================================

INSERT INTO stops (id, brand_id, name, address, city, state, postal_code, scheduled_at, status, created_at)
VALUES 
  ('s0010001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Downtown Farmers Market', '123 Main Street', 'Orlando', 'FL', '32801', NOW() + INTERVAL '2 days', 'scheduled', NOW()),
  ('s0010002-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Winter Park Community', '456 Park Avenue', 'Winter Park', 'FL', '32789', NOW() + INTERVAL '3 days', 'scheduled', NOW()),
  ('s0010003-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Maitland Office Park', '789 Commerce Blvd', 'Maitland', 'FL', '32751', NOW() + INTERVAL '5 days', 'scheduled', NOW()),
  ('s0010004-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'UCF Campus Store', '4000 Central Florida Blvd', 'Orlando', 'FL', '32816', NOW() + INTERVAL '7 days', 'scheduled', NOW()),
  ('s0010005-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Lake Mary Corporate', '1000 Business Center Dr', 'Lake Mary', 'FL', '32746', NOW() + INTERVAL '10 days', 'scheduled', NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DEMO CUSTOMERS
-- =============================================================================

INSERT INTO customers (id, brand_id, email, first_name, last_name, phone, company, created_at)
VALUES 
  ('c0010001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'john.smith@email.com', 'John', 'Smith', '+1-407-555-0101', 'Smith Family Farm', NOW()),
  ('c0010002-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'sarah.jones@email.com', 'Sarah', 'Jones', '+1-407-555-0102', 'Jones Organic Co', NOW()),
  ('c0010003-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'mike.wilson@email.com', 'Mike', 'Wilson', '+1-407-555-0103', 'Wilson Grocers', NOW()),
  ('c0010004-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'emily.brown@email.com', 'Emily', 'Brown', '+1-407-555-0104', 'Brown Cafe', NOW()),
  ('c0010005-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'david.lee@email.com', 'David', 'Lee', '+1-407-555-0105', 'Lee Restaurant Group', NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DEMO WHOLESALE CUSTOMERS
-- =============================================================================

INSERT INTO wholesale_customers (id, brand_id, company_name, contact_name, email, phone, credit_limit, payment_terms, is_active, created_at)
VALUES 
  ('w0010001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Whole Foods Market', 'Amanda Green', 'amanda.g@wholefoods.com', '+1-512-555-0201', 10000.00, 'net30', true, NOW()),
  ('w0010002-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Publix Super Markets', 'Robert Baker', 'robert.b@publix.com', '+1-863-555-0202', 25000.00, 'net30', true, NOW()),
  ('w0010003-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Fresh Market', 'Lisa Chen', 'lisa.c@freshmarket.com', '+1-919-555-0203', 15000.00, 'net15', true, NOW()),
  ('w0010004-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Trader Joes', 'Mark Johnson', 'mark.j@traderjoes.com', '+1-626-555-0204', 20000.00, 'net30', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DEMO ORDERS
-- =============================================================================

INSERT INTO orders (id, brand_id, customer_id, status, fulfillment, total_amount, customer_email, customer_name, customer_address, created_at)
VALUES 
  ('o0010001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'c0010001-0000-0000-0000-000000000001', 'completed', 'pickup', 45.87, 'john.smith@email.com', 'John Smith', '123 Main St, Orlando FL 32801', NOW() - INTERVAL '7 days'),
  ('o0010002-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'c0010002-0000-0000-0000-000000000002', 'completed', 'pickup', 62.34, 'sarah.jones@email.com', 'Sarah Jones', '456 Oak Ave, Winter Park FL 32789', NOW() - INTERVAL '5 days'),
  ('o0010003-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'c0010003-0000-0000-0000-000000000003', 'confirmed', 'pickup', 38.92, 'mike.wilson@email.com', 'Mike Wilson', '789 Pine St, Maitland FL 32751', NOW() - INTERVAL '2 days'),
  ('o0010004-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'c0010004-0000-0000-0000-000000000004', 'pending', 'ship', 89.55, 'emily.brown@email.com', 'Emily Brown', '321 Elm Blvd, Orlando FL 32816', NOW() - INTERVAL '1 day'),
  ('o0010005-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'c0010005-0000-0000-0000-000000000005', 'preparing', 'mixed', 156.78, 'david.lee@email.com', 'David Lee', '555 Commerce Dr, Lake Mary FL 32746', NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DEMO ORDER ITEMS
-- =============================================================================

INSERT INTO order_items (id, order_id, product_id, quantity, price, fulfillment, created_at)
VALUES 
  ('oi001001-0000-0000-0000-0000000001', 'o0010001-0000-0000-0000-000000000001', 'p0010001-0000-0000-0000-000000000001', 5, 3.99, 'pickup', NOW() - INTERVAL '7 days'),
  ('oi001002-0000-0000-0000-0000000002', 'o0010001-0000-0000-0000-000000000001', 'p0010003-0000-0000-0000-000000000003', 8, 2.99, 'pickup', NOW() - INTERVAL '7 days'),
  ('oi002001-0000-0000-0000-0000000003', 'o0010002-0000-0000-0000-000000000002', 'p0010002-0000-0000-0000-000000000002', 10, 3.49, 'pickup', NOW() - INTERVAL '5 days'),
  ('oi002002-0000-0000-0000-0000000004', 'o0010002-0000-0000-0000-000000000002', 'p0010005-0000-0000-0000-000000000005', 6, 3.79, 'pickup', NOW() - INTERVAL '5 days'),
  ('oi003001-0000-0000-0000-0000000005', 'o0010003-0000-0000-0000-000000000003', 'p0010004-0000-0000-0000-000000000004', 7, 3.29, 'pickup', NOW() - INTERVAL '2 days'),
  ('oi003002-0000-0000-0000-0000000006', 'o0010003-0000-0000-0000-000000000003', 'p0010007-0000-0000-0000-000000000007', 4, 4.49, 'pickup', NOW() - INTERVAL '2 days'),
  ('oi004001-0000-0000-0000-0000000007', 'o0010004-0000-0000-0000-000000000004', 'p0010010-0000-0000-0000-000000000010', 1, 54.99, 'ship', NOW() - INTERVAL '1 day'),
  ('oi004002-0000-0000-0000-0000000008', 'o0010004-0000-0000-0000-000000000004', 'p0010001-0000-0000-0000-000000000001', 5, 3.99, 'ship', NOW() - INTERVAL '1 day'),
  ('oi004003-0000-0000-0000-0000000009', 'o0010004-0000-0000-0000-000000000004', 'p0010006-0000-0000-0000-000000000006', 4, 4.29, 'ship', NOW() - INTERVAL '1 day'),
  ('oi005001-0000-0000-0000-0000000010', 'o0010005-0000-0000-0000-000000000005', 'p0010010-0000-0000-0000-000000000010', 2, 54.99, 'pickup', NOW()),
  ('oi005002-0000-0000-0000-0000000011', 'o0010005-0000-0000-0000-000000000005', 'p0010003-0000-0000-0000-000000000003', 10, 2.99, 'ship', NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DEMO COMMUNICATION CONTACTS
-- =============================================================================

INSERT INTO communication_contacts (id, brand_id, email, first_name, last_name, phone, company, email_opt_in, sms_opt_in, tags, created_at)
VALUES 
  ('cc001001-0000-0000-0000-0000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'alex.rivera@email.com', 'Alex', 'Rivera', '+1-407-555-0301', 'Rivera Consulting', true, false, ARRAY['vip', 'wholesale'], NOW()),
  ('cc001002-0000-0000-0000-0000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'jennifer.martinez@email.com', 'Jennifer', 'Martinez', '+1-407-555-0302', 'Martinez Restaurant', true, true, ARRAY['restaurant', 'wholesale'], NOW()),
  ('cc001003-0000-0000-0000-0000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'chris.taylor@email.com', 'Chris', 'Taylor', '+1-407-555-0303', 'Taylor Grocers', true, false, ARRAY['retail'], NOW()),
  ('cc001004-0000-0000-0000-0000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'michelle.davis@email.com', 'Michelle', 'Davis', '+1-407-555-0304', 'Davis Hotel Group', true, false, ARRAY['hospitality', 'wholesale'], NOW()),
  ('cc001005-0000-0000-0000-0000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'andrew.wilson@email.com', 'Andrew', 'Wilson', '+1-407-555-0305', 'Wilson Catering', true, true, ARRAY['catering'], NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DEMO WATER LOG FIELDS
-- =============================================================================

INSERT INTO water_fields (id, brand_id, name, location, size_acres, crop_type, notes, created_at)
VALUES 
  ('wf001001-0000-0000-0000-0000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'North Grove Section A', 'GPS: 28.5383,-81.3792', 15.5, 'Citrus', 'Primary navel orange section', NOW()),
  ('wf001002-0000-0000-0000-0000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'South Orchard', 'GPS: 28.5200,-81.4000', 22.0, 'Mixed Citrus', 'Mixed variety planting', NOW()),
  ('wf001003-0000-0000-0000-0000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'East Block - Honeycrisp', 'GPS: 28.5450,-81.3500', 8.5, 'Apples', 'Premium Honeycrisp apples', NOW()),
  ('wf001004-0000-0000-0000-0000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'West Test Plot', 'GPS: 28.5300,-81.4200', 3.0, 'Experimental', 'New variety test section', NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DEMO WATER LOGS
-- =============================================================================

INSERT INTO water_logs (id, brand_id, field_id, gallons, duration_minutes, water_method, notes, logged_at, created_at)
VALUES 
  ('wl001001-0000-0000-0000-0000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'wf001001-0000-0000-0000-0000000001', 2500, 45, 'drip', 'Regular weekly irrigation', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('wl001002-0000-0000-0000-0000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'wf001002-0000-0000-0000-0000000002', 4200, 60, 'sprinkler', 'Deep watering after dry spell', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  ('wl001003-0000-0000-0000-0000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'wf001003-0000-0000-0000-0000000003', 1800, 30, 'drip', 'Focused irrigation on new trees', NOW(), NOW()),
  ('wl001004-0000-0000-0000-0000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'wf001001-0000-0000-0000-0000000001', 2800, 50, 'drip', 'Extended session for heat wave', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DEMO CHANGELOGS
-- =============================================================================

INSERT INTO changelogs (id, brand_id, version, title, description, content, released_at, is_published, feature_type)
VALUES 
  ('cl001001-0000-0000-0000-0000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   '2.0.0', 'Major Platform Update',
   'We have rolled out significant improvements to the platform including a new analytics dashboard, improved order management, and faster performance.',
   '[
     {"type": "feature", "title": "New Analytics Dashboard", "description": "Real-time insights into your business performance with customizable reports and charts."},
     {"type": "feature", "title": "Improved Order Management", "description": "Faster order processing with batch operations and smart filtering."},
     {"type": "improvement", "title": "50% Faster Load Times", "description": "Optimized frontend for lightning-fast navigation across all pages."},
     {"type": "bugfix", "title": "Fixed Mobile Checkout", "description": "Resolved issues with checkout on iOS devices."}
   ]'::jsonb,
   NOW() - INTERVAL '3 days', true, 'major'),
  ('cl001002-0000-0000-0000-0000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   '1.9.5', 'Water Log Enhancement',
   'Added new water tracking features including field mapping and usage analytics.',
   '[
     {"type": "feature", "title": "Field GPS Mapping", "description": "Track water usage by GPS-defined field boundaries."},
     {"type": "feature", "title": "Usage Analytics", "description": "Weekly and monthly water usage reports with trend analysis."},
     {"type": "improvement", "title": "Mobile-Friendly Interface", "description": "Optimized for field workers on mobile devices."}
   ]'::jsonb,
   NOW() - INTERVAL '2 weeks', true, 'feature')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DEMO REFERRAL CODES
-- =============================================================================

INSERT INTO referral_codes (id, brand_id, referrer_user_id, referral_code, referrer_email, reward_type, reward_value, max_uses)
VALUES 
  ('rc001001-0000-0000-0000-0000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'u0010001-0000-0000-0000-0000000001', 'SUNRISE20', 'admin@sunrisefarms.com', 'percentage', 20.00, 10)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- DEMO ADMIN USERS
-- =============================================================================

INSERT INTO admin_users (id, user_id, brand_id, email, role, active, can_manage_products, can_manage_stops, can_manage_orders, can_manage_pickup, can_manage_messages, can_manage_refunds, can_manage_users, can_manage_water_log, can_manage_reports, can_manage_settings)
VALUES 
  ('au001001-0000-0000-0000-0000000001', 'u0010001-0000-0000-0000-0000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'admin@sunrisefarms.com', 'brand_admin', true, true, true, true, true, true, true, true, true, true),
  ('au001002-0000-0000-0000-0000000002', 'u0010002-0000-0000-0000-0000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'manager@sunrisefarms.com', 'brand_admin', true, true, true, true, false, true, false, true, true, true)
ON CONFLICT (id) DO NOTHING;

COMMIT;