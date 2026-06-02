// Reports API - Route-based handlers
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiLimiter, checkRateLimit, rateLimitExceeded, securityHeaders } from "@/lib/rate-limit";
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

    return apiResponse(report);
  } catch (error) {
    captureError(error as Error, { path: "/api/reports", method: "GET" });
    return apiError("Internal server error", 500);
  }
}

// OPTIONS handler
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      ...securityHeaders(),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}