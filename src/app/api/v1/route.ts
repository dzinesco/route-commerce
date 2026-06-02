// Production API Routes with Rate Limiting and Validation

import { NextRequest } from "next/server";
import { z } from "zod";
import { 
  apiLimiter, 
  checkoutLimiter, 
  emailLimiter,
  checkRateLimit, 
  apiResponse, 
  apiError, 
  validationError,
  rateLimitExceeded,
  securityHeaders 
} from "@/lib/rate-limit";
import { analytics } from "@/lib/analytics";
import { captureError } from "@/lib/sentry";

// ============================================
// API HEALTH CHECK
// ============================================

export async function GET() {
  return apiResponse({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV,
  });
}

// ============================================
// ORDERS API
// ============================================

const createOrderSchema = z.object({
  brand_id: z.string().uuid(),
  customer_email: z.string().email().optional(),
  customer_name: z.string().min(1).max(255).optional(),
  customer_phone: z.string().regex(/^\+?[\d\s-()]+$/).optional(),
  customer_address: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
    fulfillment: z.enum(["pickup", "ship"]).default("pickup"),
  })).min(1),
  fulfillment: z.enum(["pickup", "ship", "mixed"]).optional(),
  stop_id: z.string().uuid().optional(),
  promo_code: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateCheck = await checkRateLimit(checkoutLimiter, req.headers.get("x-forwarded-for") || "anonymous");
    if (!rateCheck.success) {
      return rateLimitExceeded(Math.ceil((rateCheck.reset - Date.now()) / 1000));
    }

    // Parse and validate body
    const body = await req.json();
    const validation = createOrderSchema.safeParse(body);
    
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { brand_id, ...orderData } = validation.data;

    // Create order via RPC
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/rpc/create_order_with_items`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          p_brand_id: brand_id,
          p_customer_email: orderData.customer_email,
          p_customer_name: orderData.customer_name,
          p_customer_phone: orderData.customer_phone,
          p_customer_address: orderData.customer_address,
          p_items: orderData.items,
          p_fulfillment: orderData.fulfillment || "pickup",
          p_stop_id: orderData.stop_id,
          p_promo_code: orderData.promo_code,
          p_notes: orderData.notes,
        }),
      }
    );

    if (!res.ok) {
      const error = await res.json();
      return apiError(error.message || "Failed to create order", 500);
    }

    const order = await res.json();
    
    // Track analytics
    analytics.orderCreated(order.id, orderData.items.reduce((sum, i) => sum + i.price * i.quantity, 0), brand_id);

    return apiResponse(order, 201);
  } catch (error) {
    captureError(error as Error, { path: "/api/orders", method: "POST" });
    return apiError("Internal server error", 500);
  }
}

// ============================================
// PRODUCTS API
// ============================================

const getProductsSchema = z.object({
  brand_id: z.string().uuid().optional(),
  category: z.string().optional(),
  is_active: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const rateCheck = await checkRateLimit(apiLimiter, req.headers.get("x-forwarded-for") || "anonymous");
    if (!rateCheck.success) {
      return rateLimitExceeded(Math.ceil((rateCheck.reset - Date.now()) / 1000));
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const params = {
      brand_id: searchParams.get("brand_id") || undefined,
      category: searchParams.get("category") || undefined,
      is_active: searchParams.get("is_active") === "true" ? true : searchParams.get("is_active") === "false" ? false : undefined,
      search: searchParams.get("search") || undefined,
      limit: parseInt(searchParams.get("limit") || "20"),
      offset: parseInt(searchParams.get("offset") || "0"),
    };

    const validation = getProductsSchema.safeParse(params);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Build query
    let query = `${supabaseUrl}/rest/v1/products?select=*&order=name.asc&limit=${validation.data.limit}&offset=${validation.data.offset}`;
    
    if (validation.data.brand_id) {
      query += `&brand_id=eq.${validation.data.brand_id}`;
    }
    if (validation.data.category) {
      query += `&category=ilike.*${encodeURIComponent(validation.data.category)}*`;
    }
    if (validation.data.is_active !== undefined) {
      query += `&is_active=eq.${validation.data.is_active}`;
    }
    if (validation.data.search) {
      query += `&or=(name.ilike.*${encodeURIComponent(validation.data.search)}*,description.ilike.*${encodeURIComponent(validation.data.search)}*)`;
    }

    const res = await fetch(query, {
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return apiError("Failed to fetch products", 500);
    }

    const products = await res.json();
    
    // Track search analytics
    if (validation.data.search) {
      analytics.searchPerformed(validation.data.search, products.length, "products");
    }

    return apiResponse(products, 200, {
      limit: validation.data.limit,
      offset: validation.data.offset,
      count: products.length,
    }, {
      ...securityHeaders(),
      ...rateLimitHeaders(rateCheck),
    });
  } catch (error) {
    captureError(error as Error, { path: "/api/products", method: "GET" });
    return apiError("Internal server error", 500);
  }
}

// ============================================
// CAMPAIGNS API (Email/SMS)
// ============================================

const createCampaignSchema = z.object({
  brand_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(500),
  content: z.string().min(1),
  type: z.enum(["email", "sms"]).default("email"),
  segment_id: z.string().uuid().optional(),
  contact_ids: z.array(z.string().uuid()).optional(),
  scheduled_at: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateCheck = await checkRateLimit(emailLimiter, req.headers.get("x-forwarded-for") || "anonymous");
    if (!rateCheck.success) {
      return rateLimitExceeded(Math.ceil((rateCheck.reset - Date.now()) / 1000));
    }

    // Parse and validate body
    const body = await req.json();
    const validation = createCampaignSchema.safeParse(body);
    
    if (!validation.success) {
      return validationError(validation.error);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Create campaign via RPC
    const res = await fetch(
      `${supabaseUrl}/rest/v1/rpc/create_campaign`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          p_brand_id: validation.data.brand_id,
          p_name: validation.data.name,
          p_subject: validation.data.subject,
          p_content: validation.data.content,
          p_type: validation.data.type,
          p_segment_id: validation.data.segment_id,
          p_contact_ids: validation.data.contact_ids,
          p_scheduled_at: validation.data.scheduled_at,
        }),
      }
    );

    if (!res.ok) {
      const error = await res.json();
      return apiError(error.message || "Failed to create campaign", 500);
    }

    const campaign = await res.json();
    
    // Track analytics
    const audienceSize = validation.data.contact_ids?.length || 0;
    analytics.campaignCreated(campaign.id, validation.data.type, audienceSize);

    return apiResponse(campaign, 201);
  } catch (error) {
    captureError(error as Error, { path: "/api/campaigns", method: "POST" });
    return apiError("Internal server error", 500);
  }
}

// ============================================
// WATER LOG API
// ============================================

const createWaterLogSchema = z.object({
  brand_id: z.string().uuid(),
  field_id: z.string().uuid().optional(),
  field_name: z.string().max(255).optional(),
  gallons: z.number().positive(),
  duration_minutes: z.number().int().nonnegative().optional(),
  water_method: z.enum(["drip", "sprinkler", "flood", "manual"]).optional(),
  notes: z.string().max(500).optional(),
  logged_at: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateCheck = await checkRateLimit(apiLimiter, req.headers.get("x-forwarded-for") || "anonymous");
    if (!rateCheck.success) {
      return rateLimitExceeded(Math.ceil((rateCheck.reset - Date.now()) / 1000));
    }

    // Parse and validate body
    const body = await req.json();
    const validation = createWaterLogSchema.safeParse(body);
    
    if (!validation.success) {
      return validationError(validation.error);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Create water log via RPC
    const res = await fetch(
      `${supabaseUrl}/rest/v1/rpc/create_water_log`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          p_brand_id: validation.data.brand_id,
          p_field_id: validation.data.field_id,
          p_field_name: validation.data.field_name,
          p_gallons: validation.data.gallons,
          p_duration_minutes: validation.data.duration_minutes,
          p_water_method: validation.data.water_method,
          p_notes: validation.data.notes,
          p_logged_at: validation.data.logged_at,
        }),
      }
    );

    if (!res.ok) {
      const error = await res.json();
      return apiError(error.message || "Failed to create water log", 500);
    }

    const waterLog = await res.json();

    return apiResponse(waterLog, 201);
  } catch (error) {
    captureError(error as Error, { path: "/api/water-logs", method: "POST" });
    return apiError("Internal server error", 500);
  }
}

// ============================================
// REPORTS API
// ============================================

const reportFiltersSchema = z.object({
  brand_id: z.string().uuid(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  report_type: z.enum(["orders", "revenue", "customers", "products"]).default("orders"),
});

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const rateCheck = await checkRateLimit(apiLimiter, req.headers.get("x-forwarded-for") || "anonymous");
    if (!rateCheck.success) {
      return rateLimitExceeded(Math.ceil((rateCheck.reset - Date.now()) / 1000));
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const params = {
      brand_id: searchParams.get("brand_id")!,
      start_date: searchParams.get("start_date")!,
      end_date: searchParams.get("end_date")!,
      report_type: searchParams.get("report_type") || "orders",
    };

    const validation = reportFiltersSchema.safeParse(params);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Get report via RPC
    const res = await fetch(
      `${supabaseUrl}/rest/v1/rpc/generate_report`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          p_brand_id: validation.data.brand_id,
          p_start_date: validation.data.start_date,
          p_end_date: validation.data.end_date,
          p_report_type: validation.data.report_type,
        }),
      }
    );

    if (!res.ok) {
      return apiError("Failed to generate report", 500);
    }

    const report = await res.json();

    return apiResponse(report, 200);
  } catch (error) {
    captureError(error as Error, { path: "/api/reports", method: "GET" });
    return apiError("Internal server error", 500);
  }
}

// ============================================
// REFERRAL API
// ============================================

const createReferralSchema = z.object({
  brand_id: z.string().uuid(),
  referred_email: z.string().email(),
  referral_code: z.string().min(6).max(50),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateCheck = await checkRateLimit(apiLimiter, req.headers.get("x-forwarded-for") || "anonymous");
    if (!rateCheck.success) {
      return rateLimitExceeded(Math.ceil((rateCheck.reset - Date.now()) / 1000));
    }

    const body = await req.json();
    const validation = createReferralSchema.safeParse(body);
    
    if (!validation.success) {
      return validationError(validation.error);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Redeem referral via RPC
    const res = await fetch(
      `${supabaseUrl}/rest/v1/rpc/redeem_referral`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          p_brand_id: validation.data.brand_id,
          p_referred_email: validation.data.referred_email,
          p_referral_code: validation.data.referral_code,
        }),
      }
    );

    if (!res.ok) {
      const error = await res.json();
      return apiError(error.message || "Failed to redeem referral", 500);
    }

    const referral = await res.json();
    
    analytics.referralCompleted(validation.data.referral_code, referral.referred_user_id);

    return apiResponse(referral, 201);
  } catch (error) {
    captureError(error as Error, { path: "/api/referrals", method: "POST" });
    return apiError("Internal server error", 500);
  }
}

// ============================================
// OPTIONS HANDLER (CORS preflight)
// ============================================

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      ...securityHeaders(),
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
      "Access-Control-Max-Age": "86400",
    },
  });
}