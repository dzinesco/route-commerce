// Products API - Route-based handlers
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiLimiter, checkRateLimit, rateLimitExceeded, securityHeaders } from "@/lib/rate-limit";
import { analytics } from "@/lib/analytics";
import { captureError } from "@/lib/sentry";

// Helper functions
function apiResponse(data: unknown, status: number = 200) {
  return NextResponse.json({ data }, { status });
}

function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function validationError(error: z.ZodError) {
  return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
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

    return apiResponse(products, 200);
  } catch (error) {
    captureError(error as Error, { path: "/api/products", method: "GET" });
    return apiError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const rateCheck = await checkRateLimit(apiLimiter, req.headers.get("x-forwarded-for") || "anonymous");
    if (!rateCheck.success) {
      return rateLimitExceeded(Math.ceil((rateCheck.reset - Date.now()) / 1000));
    }

    const body = await req.json();
    const { brand_id, name, description, price, category, is_active } = body;

    if (!brand_id || !name) {
      return apiError("brand_id and name are required", 400);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/products`,
      {
        method: "POST",
        headers: {
          apikey: serviceKey,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          brand_id,
          name,
          description,
          price,
          category,
          is_active: is_active !== false,
        }),
      }
    );

    if (!res.ok) {
      const error = await res.json();
      return apiError(error.message || "Failed to create product", 500);
    }

    const product = await res.json();
    return apiResponse(product, 201);
  } catch (error) {
    captureError(error as Error, { path: "/api/products", method: "POST" });
    return apiError("Internal server error", 500);
  }
}

// ============================================
// OPTIONS (CORS preflight)
// ============================================

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      ...securityHeaders(),
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}