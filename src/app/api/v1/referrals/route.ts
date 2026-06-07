// Referrals API - Route-based handlers
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiLimiter, checkRateLimit, rateLimitExceeded, securityHeaders } from "@/lib/rate-limit";
import { analytics } from "@/lib/analytics";
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

    // Redeem referral via RPC
    const { rows } = await pool.query<{ redeem_referral: { referred_user_id?: string; [k: string]: unknown } | null }>(
      `SELECT redeem_referral($1, $2, $3) AS redeem_referral`,
      [
        validation.data.brand_id,
        validation.data.referred_email,
        validation.data.referral_code,
      ],
    );
    const referral = rows[0]?.redeem_referral;
    if (!referral) {
      return apiError("Failed to redeem referral", 500);
    }

    analytics.referralCompleted(validation.data.referral_code, referral.referred_user_id);

    return apiResponse(referral, 201);
  } catch (error) {
    captureError(error as Error, { path: "/api/referrals", method: "POST" });
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

    const { rows: referrals } = await pool.query(
      `SELECT * FROM referral_codes
       WHERE brand_id = $1
       ORDER BY created_at DESC`,
      [brand_id],
    );

    return apiResponse(referrals);
  } catch (error) {
    captureError(error as Error, { path: "/api/referrals", method: "GET" });
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
