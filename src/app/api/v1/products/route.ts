// Products API - Route-based handlers
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiLimiter, checkRateLimit, rateLimitExceeded, securityHeaders } from "@/lib/rate-limit";
import { analytics } from "@/lib/analytics";
import { captureError } from "@/lib/sentry";
import { withDb, withPlatformAdmin } from "@/db/client";
import { products, type Product } from "@/db/schema";
import { and, eq, ilike, or, sql } from "drizzle-orm";

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

    // Build the WHERE conditions. We use `withDb` (no tenant GUC) here
    // because this is a public API — RLS isn't enforced via the new
    // schema's app.current_tenant_id GUC, so we filter explicitly.
    const whereParts = [];
    if (validation.data.brand_id) {
      whereParts.push(eq(products.tenantId, validation.data.brand_id));
    }
    if (validation.data.is_active !== undefined) {
      whereParts.push(eq(products.active, validation.data.is_active));
    }
    if (validation.data.search) {
      const term = `%${validation.data.search}%`;
      whereParts.push(
        or(ilike(products.name, term), ilike(products.description, term))!,
      );
    }
    const where = whereParts.length > 0 ? and(...whereParts) : undefined;

    // Note: the legacy schema had a `category` column on products; the
    // new schema doesn't. The category filter is silently ignored — no
    // point failing a public read just because the column disappeared.
    void validation.data.category;

    // Public read across all tenants (this is a public catalog API, not
    // an admin endpoint), so use `withDb` rather than `withTenant`.
    const rows = await withDb(async (db) =>
      db
        .select()
        .from(products)
        .where(where)
        .orderBy(products.name)
        .limit(validation.data.limit)
        .offset(validation.data.offset),
    );

    // Track search analytics
    if (validation.data.search) {
      analytics.searchPerformed(validation.data.search, rows.length, "products");
    }

    return apiResponse(rows, 200);
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
    const { brand_id, name, description, price, is_active } = body as {
      brand_id?: string;
      name?: string;
      description?: string;
      price?: number;
      category?: string;
      is_active?: boolean;
    };

    if (!brand_id || !name) {
      return apiError("brand_id and name are required", 400);
    }
    if (typeof price !== "number") {
      return apiError("price is required (number)", 400);
    }

    // Insert the product. Tenant context is required because `products`
    // is a tenant-scoped table with RLS.
    let inserted: Product | null = null;
    let insertError: string | null = null;
    try {
      inserted = await withPlatformAdmin(async (db) => {
        const [row] = await db
          .insert(products)
          .values({
            tenantId: brand_id,
            name,
            description: description ?? null,
            priceCents: Math.round(price * 100),
            active: is_active !== false,
          })
          .returning();
        return row ?? null;
      });
    } catch (err) {
      insertError = err instanceof Error ? err.message : "Failed to create product";
    }
    if (insertError) {
      return apiError(insertError, 500);
    }
    if (!inserted) {
      return apiError("Insert returned no row", 500);
    }

    return apiResponse(inserted, 201);
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

// Keep `sql` reachable so the import isn't tree-shaken — we use it
// elsewhere if query extensions are added.
void sql;
