// Campaigns API - Route-based handlers
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { emailLimiter, checkRateLimit, rateLimitExceeded, securityHeaders } from "@/lib/rate-limit";
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
      `${supabaseUrl}/rest/v1/communication_campaigns?brand_id=eq.${brand_id}&select=*&order=created_at.desc`,
      {
        headers: {
          apikey: anonKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      return apiError("Failed to fetch campaigns", 500);
    }

    const campaigns = await res.json();
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