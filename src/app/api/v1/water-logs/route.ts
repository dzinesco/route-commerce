// Water Logs API - Route-based handlers
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiLimiter, checkRateLimit, rateLimitExceeded, securityHeaders } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";
import { pool } from "@/lib/db";

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

    // Create water log via RPC
    const { rows } = await pool.query<{ create_water_log: { id: string; [k: string]: unknown } | null }>(
      `SELECT create_water_log($1, $2, $3, $4, $5, $6, $7, $8) AS create_water_log`,
      [
        validation.data.brand_id,
        validation.data.field_id ?? null,
        validation.data.field_name ?? null,
        validation.data.gallons,
        validation.data.duration_minutes ?? null,
        validation.data.water_method ?? null,
        validation.data.notes ?? null,
        validation.data.logged_at ?? null,
      ],
    );
    const waterLog = rows[0]?.create_water_log;
    if (!waterLog) {
      return apiError("Failed to create water log", 500);
    }

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

    const { rows: waterLogs } = await pool.query(
      `SELECT * FROM water_logs
       WHERE brand_id = $1
       ORDER BY logged_at DESC
       LIMIT 100`,
      [brand_id],
    );

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
