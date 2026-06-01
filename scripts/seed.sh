#!/bin/bash
# Seed script for Route Commerce Platform
# Run with: bash scripts/seed.sh

set -e

# Use service role key for write operations during seeding
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
ANON_KEY="${ANON_KEY:-$NEXT_PUBLIC_SUPABASE_ANON_KEY}"

AUTH_HEADER="apikey: $SERVICE_KEY"
CONTENT_TYPE="Content-Type: application/json"

echo "Fetching brands..."
BRANDS=$(curl -s "$SUPABASE_URL/rest/v1/brands?select=id,name" \
  -H "$AUTH_HEADER")
echo "Brands: $BRANDS"

TUXEDO_ID=$(echo "$BRANDS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
IRD_ID=$(echo "$BRANDS" | grep -o '"id":"[^"]*"' | tail -1 | cut -d'"' -f4)

echo "Tuxedo: $TUXEDO_ID"
echo "IRD: $IRD_ID"

echo ""
echo "Creating stops..."

STOP1=$(curl -s -X POST "$SUPABASE_URL/rest/v1/stops" \
  -H "$AUTH_HEADER" \
  -H "$CONTENT_TYPE" \
  -H "Prefer: return=representation" \
  -d '{
    "brand_id": "'"$TUXEDO_ID"'",
    "city": "Burlington",
    "state": "NC",
    "date": "2026-05-15",
    "time": "8:00 AM – 2:00 PM",
    "location": "102 W Front St, Burlington, NC",
    "slug": "burlington-nc-2026-05-15",
    "active": true
  }')
echo "Stop 1: $STOP1"

STOP2=$(curl -s -X POST "$SUPABASE_URL/rest/v1/stops" \
  -H "$AUTH_HEADER" \
  -H "$CONTENT_TYPE" \
  -H "Prefer: return=representation" \
  -d '{
    "brand_id": "'"$TUXEDO_ID"'",
    "city": "Greensboro",
    "state": "NC",
    "date": "2026-05-16",
    "time": "8:00 AM – 2:00 PM",
    "location": "200 S Elm St, Greensboro, NC",
    "slug": "greensboro-nc-2026-05-16",
    "active": true
  }')
echo "Stop 2: $STOP2"

STOP3=$(curl -s -X POST "$SUPABASE_URL/rest/v1/stops" \
  -H "$AUTH_HEADER" \
  -H "$CONTENT_TYPE" \
  -H "Prefer: return=representation" \
  -d '{
    "brand_id": "'"$IRD_ID"'",
    "city": "Fort Pierce",
    "state": "FL",
    "date": "2026-05-15",
    "time": "7:00 AM – 1:00 PM",
    "location": "1224 N US-1, Fort Pierce, FL",
    "slug": "fort-pierce-fl-2026-05-15",
    "active": true
  }')
echo "Stop 3: $STOP3"

echo ""
echo "Creating products..."

PROD1=$(curl -s -X POST "$SUPABASE_URL/rest/v1/products" \
  -H "$AUTH_HEADER" \
  -H "$CONTENT_TYPE" \
  -H "Prefer: return=representation" \
  -d '{
    "brand_id": "'"$TUXEDO_ID"'",
    "name": "Sweet Corn",
    "description": "Fresh picked white sweet corn, 8 ears per bag",
    "price": 12,
    "type": "Sweet Corn",
    "active": true
  }')
echo "Prod 1: $PROD1"

PROD2=$(curl -s -X POST "$SUPABASE_URL/rest/v1/products" \
  -H "$AUTH_HEADER" \
  -H "$CONTENT_TYPE" \
  -H "Prefer: return=representation" \
  -d '{
    "brand_id": "'"$TUXEDO_ID"'",
    "name": "Peaches",
    "description": "Just-peeled freestone peaches, pint jar",
    "price": 8,
    "type": "Fruit",
    "active": true
  }')
echo "Prod 2: $PROD2"

PROD3=$(curl -s -X POST "$SUPABASE_URL/rest/v1/products" \
  -H "$AUTH_HEADER" \
  -H "$CONTENT_TYPE" \
  -H "Prefer: return=representation" \
  -d '{
    "brand_id": "'"$TUXEDO_ID"'",
    "name": "Corn & Peach Bundle",
    "description": "Sweet corn + peaches combo, save $2",
    "price": 18,
    "type": "Bundle",
    "active": true
  }')
echo "Prod 3: $PROD3"

PROD4=$(curl -s -X POST "$SUPABASE_URL/rest/v1/products" \
  -H "$AUTH_HEADER" \
  -H "$CONTENT_TYPE" \
  -H "Prefer: return=representation" \
  -d '{
    "brand_id": "'"$IRD_ID"'",
    "name": "Navel Oranges",
    "description": "Premium navel oranges, 4 lb bag",
    "price": 15,
    "type": "Citrus",
    "active": true
  }')
echo "Prod 4: $PROD4"

PROD5=$(curl -s -X POST "$SUPABASE_URL/rest/v1/products" \
  -H "$AUTH_HEADER" \
  -H "$CONTENT_TYPE" \
  -H "Prefer: return=representation" \
  -d '{
    "brand_id": "'"$IRD_ID"'",
    "name": "Grapefruit",
    "description": "Ruby red grapefruit, 3 lb bag",
    "price": 12,
    "type": "Citrus",
    "active": true
  }')
echo "Prod 5: $PROD5"

PROD6=$(curl -s -X POST "$SUPABASE_URL/rest/v1/products" \
  -H "$AUTH_HEADER" \
  -H "$CONTENT_TYPE" \
  -H "Prefer: return=representation" \
  -d '{
    "brand_id": "'"$IRD_ID"'",
    "name": "Citrus Sampler",
    "description": "Oranges, grapefruit & tangelos, 6 lb mix",
    "price": 22,
    "type": "Bundle",
    "active": true
  }')
echo "Prod 6: $PROD6"

P1_ID=$(echo "$PROD1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
P2_ID=$(echo "$PROD2" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
P3_ID=$(echo "$PROD3" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
P4_ID=$(echo "$PROD4" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
P5_ID=$(echo "$PROD5" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
P6_ID=$(echo "$PROD6" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

S1_ID=$(echo "$STOP1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
S2_ID=$(echo "$STOP2" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
S3_ID=$(echo "$STOP3" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo "Assigning products to stops..."

curl -s -X POST "$SUPABASE_URL/rest/v1/product_stops" \
  -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"stop_id": "'"$S1_ID"'", "product_id": "'"$P1_ID"'"}' > /dev/null
curl -s -X POST "$SUPABASE_URL/rest/v1/product_stops" \
  -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"stop_id": "'"$S1_ID"'", "product_id": "'"$P2_ID"'"}' > /dev/null
curl -s -X POST "$SUPABASE_URL/rest/v1/product_stops" \
  -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"stop_id": "'"$S1_ID"'", "product_id": "'"$P3_ID"'"}' > /dev/null
curl -s -X POST "$SUPABASE_URL/rest/v1/product_stops" \
  -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"stop_id": "'"$S2_ID"'", "product_id": "'"$P1_ID"'"}' > /dev/null
curl -s -X POST "$SUPABASE_URL/rest/v1/product_stops" \
  -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"stop_id": "'"$S2_ID"'", "product_id": "'"$P3_ID"'"}' > /dev/null
curl -s -X POST "$SUPABASE_URL/rest/v1/product_stops" \
  -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"stop_id": "'"$S3_ID"'", "product_id": "'"$P4_ID"'"}' > /dev/null
curl -s -X POST "$SUPABASE_URL/rest/v1/product_stops" \
  -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"stop_id": "'"$S3_ID"'", "product_id": "'"$P5_ID"'"}' > /dev/null
curl -s -X POST "$SUPABASE_URL/rest/v1/product_stops" \
  -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"stop_id": "'"$S3_ID"'", "product_id": "'"$P6_ID"'"}' > /dev/null

echo ""
echo "Creating orders..."

ORDER1=$(curl -s -X POST "$SUPABASE_URL/rest/v1/orders" \
  -H "$AUTH_HEADER" \
  -H "$CONTENT_TYPE" \
  -H "Prefer: return=representation" \
  -d '{
    "customer_name": "Sarah Mitchell",
    "customer_email": "sarah.m@email.com",
    "customer_phone": "(336) 555-0142",
    "stop_id": "'"$S1_ID"'",
    "status": "pending",
    "subtotal": 32,
    "discount_amount": 0,
    "pickup_complete": false,
    "payment_processor": "manual",
    "payment_status": "paid"
  }')
echo "Order 1: $ORDER1"

ORDER2=$(curl -s -X POST "$SUPABASE_URL/rest/v1/orders" \
  -H "$AUTH_HEADER" \
  -H "$CONTENT_TYPE" \
  -H "Prefer: return=representation" \
  -d '{
    "customer_name": "James Rivera",
    "customer_email": "jrivera@email.com",
    "customer_phone": "(336) 555-0298",
    "stop_id": "'"$S1_ID"'",
    "status": "confirmed",
    "subtotal": 22,
    "discount_amount": 2,
    "discount_reason": "First-time customer",
    "pickup_complete": true,
    "payment_processor": "manual",
    "payment_status": "paid"
  }')
echo "Order 2: $ORDER2"

ORDER3=$(curl -s -X POST "$SUPABASE_URL/rest/v1/orders" \
  -H "$AUTH_HEADER" \
  -H "$CONTENT_TYPE" \
  -H "Prefer: return=representation" \
  -d '{
    "customer_name": "Lisa Chen",
    "customer_phone": "(919) 555-0763",
    "stop_id": "'"$S2_ID"'",
    "status": "pending",
    "subtotal": 12,
    "pickup_complete": false,
    "payment_processor": "manual",
    "payment_status": "pending"
  }')
echo "Order 3: $ORDER3"

ORDER4=$(curl -s -X POST "$SUPABASE_URL/rest/v1/orders" \
  -H "$AUTH_HEADER" \
  -H "$CONTENT_TYPE" \
  -H "Prefer: return=representation" \
  -d '{
    "customer_name": "Marcus Thompson",
    "customer_email": "mthompson@email.com",
    "customer_phone": "(772) 555-0119",
    "stop_id": "'"$S3_ID"'",
    "status": "confirmed",
    "subtotal": 37,
    "pickup_complete": false,
    "payment_processor": "venmo",
    "payment_status": "paid",
    "payment_transaction_id": "VEN-88420"
  }')
echo "Order 4: $ORDER4"

ORDER5=$(curl -s -X POST "$SUPABASE_URL/rest/v1/orders" \
  -H "$AUTH_HEADER" \
  -H "$CONTENT_TYPE" \
  -H "Prefer: return=representation" \
  -d '{
    "customer_name": "Amanda Foster",
    "customer_email": "afoster@email.com",
    "stop_id": "'"$S3_ID"'",
    "status": "cancelled",
    "subtotal": 15,
    "pickup_complete": false,
    "internal_notes": "Customer cancelled after hours, no show next day",
    "payment_processor": "manual",
    "payment_status": "refunded",
    "refunded_amount": 15,
    "refund_reason": "Customer cancelled"
  }')
echo "Order 5: $ORDER5"

O1_ID=$(echo "$ORDER1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
O2_ID=$(echo "$ORDER2" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
O3_ID=$(echo "$ORDER3" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
O4_ID=$(echo "$ORDER4" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
O5_ID=$(echo "$ORDER5" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo "Creating order items..."

curl -s -X POST "$SUPABASE_URL/rest/v1/order_items" \
  -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"order_id": "'"$O1_ID"'", "product_id": "'"$P1_ID"'", "quantity": 2, "price": 12}' > /dev/null
curl -s -X POST "$SUPABASE_URL/rest/v1/order_items" \
  -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"order_id": "'"$O1_ID"'", "product_id": "'"$P2_ID"'", "quantity": 1, "price": 8}' > /dev/null

curl -s -X POST "$SUPABASE_URL/rest/v1/order_items" \
  -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"order_id": "'"$O2_ID"'", "product_id": "'"$P3_ID"'", "quantity": 1, "price": 18}' > /dev/null
curl -s -X POST "$SUPABASE_URL/rest/v1/order_items" \
  -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"order_id": "'"$O2_ID"'", "product_id": "'"$P1_ID"'", "quantity": 2, "price": 12}' > /dev/null

curl -s -X POST "$SUPABASE_URL/rest/v1/order_items" \
  -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"order_id": "'"$O3_ID"'", "product_id": "'"$P1_ID"'", "quantity": 1, "price": 12}' > /dev/null

curl -s -X POST "$SUPABASE_URL/rest/v1/order_items" \
  -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"order_id": "'"$O4_ID"'", "product_id": "'"$P4_ID"'", "quantity": 2, "price": 15}' > /dev/null
curl -s -X POST "$SUPABASE_URL/rest/v1/order_items" \
  -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"order_id": "'"$O4_ID"'", "product_id": "'"$P5_ID"'", "quantity": 1, "price": 12}' > /dev/null

curl -s -X POST "$SUPABASE_URL/rest/v1/order_items" \
  -H "$AUTH_HEADER" -H "$CONTENT_TYPE" \
  -d '{"order_id": "'"$O5_ID"'", "product_id": "'"$P4_ID"'", "quantity": 1, "price": 15}' > /dev/null

echo ""
echo "Done! Seed data created:"
echo "  3 stops (Burlington NC, Greensboro NC, Fort Pierce FL)"
echo "  6 products (3 Tuxedo Corn, 3 Indian River Direct)"
echo "  5 orders with items"
echo ""
echo "Quick test URLs:"
echo "  /admin/orders"
echo "  /admin/products"
echo "  /admin/stops"
