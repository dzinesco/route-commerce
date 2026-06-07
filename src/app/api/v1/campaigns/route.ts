// Campaigns API - Route-based handlers
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { emailLimiter, checkRateLimit, rateLimitExceeded, securityHeaders } from "@/lib/rate-limit";
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
// CAMPAIGNS API
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

    // Create campaign via RPC
    const { rows: campaignRows } = await pool.query<{ create_campaign: { id: string; [k: string]: unknown } | null }>(
      `SELECT create_campaign($1, $2, $3, $4, $5, $6, $7::uuid[], $8) AS create_campaign`,
      [
        validation.data.brand_id,
        validation.data.name,
        validation.data.subject,
        validation.data.content,
        validation.data.type,
        validation.data.segment_id ?? null,
        validation.data.contact_ids ?? null,
        validation.data.scheduled_at ?? null,
      ],
    );

    const campaign = campaignRows[0]?.create_campaign;
    if (!campaign) {
      return apiError("Failed to create campaign", 500);
    }

    // Track analytics
    const audienceSize = validation.data.contact_ids?.length || 0;
    analytics.campaignCreated(campaign.id, validation.data.type, audienceSize);

    return apiResponse(campaign, 201);
  } catch (error) {
    captureError(error as Error, { path: "/api/campaigns", method: "POST" });
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

    const { rows: campaigns } = await pool.query(
      `SELECT * FROM communication_campaigns
       WHERE brand_id = $1
       ORDER BY created_at DESC`,
      [brand_id],
    );

    return apiResponse(campaigns);
  } catch (error) {
    captureError(error as Error, { path: "/api/campaigns", method: "GET" });
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
