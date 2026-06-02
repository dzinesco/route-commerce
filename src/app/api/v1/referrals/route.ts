// Referrals API - Route-based handlers
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
      `${supabaseUrl}/rest/v1/referral_codes?brand_id=eq.${brand_id}&select=*&order=created_at.desc`,
      {
        headers: {
          apikey: anonKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      return apiError("Failed to fetch referrals", 500);
    }

    const referrals = await res.json();
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