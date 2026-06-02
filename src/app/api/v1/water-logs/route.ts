// Water Logs API - Route-based handlers
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brand_id = searchParams.get("brand_id");

    if (!brand_id) {
      return apiError("brand_id is required", 400);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/water_logs?brand_id=eq.${brand_id}&select=*&order=logged_at.desc&limit=100`,
      {
        headers: {
          apikey: anonKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      return apiError("Failed to fetch water logs", 500);
    }

    const waterLogs = await res.json();
    return apiResponse(waterLogs);
  } catch (error) {
    captureError(error as Error, { path: "/api/water-logs", method: "GET" });
    return apiError("Internal server error", 500);
  }
}

// OPTIONS handler
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