// Referrals API - Generate and track referral codes
import { NextRequest, NextResponse } from "next/server";

const REFERRAL_REWARD_PERCENTAGE = 20;
const MAX_USES_PER_CODE = 10;

interface ReferralCode {
  code: string;
  reward_type: "percentage" | "fixed";
  reward_value: number;
  uses: number;
  max_uses: number;
  created_at: string;
  brand_id: string;
  user_id: string;
}

// In-memory store for demo (replace with Supabase in production)
const referralCodes = new Map<string, ReferralCode>();

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brand_id");
  const userId = searchParams.get("user_id");

  if (!brandId || !userId) {
    return NextResponse.json(
      { error: "brand_id and user_id are required" },
      { status: 400 }
    );
  }

  // Get all codes for this user
  const userCodes: ReferralCode[] = [];
  for (const code of referralCodes.values()) {
    if (code.brand_id === brandId && code.user_id === userId) {
      userCodes.push(code);
    }
  }

  // Calculate stats
  const stats = {
    total_referrals: userCodes.reduce((sum, code) => sum + code.uses, 0),
    successful_conversions: userCodes.reduce((sum, code) => sum + code.uses, 0),
    total_reward_value: userCodes.reduce(
      (sum, code) => sum + code.uses * code.reward_value,
      0
    ),
  };

  return NextResponse.json({
    codes: userCodes,
    stats,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, brand_id, user_id } = body;

    if (action === "generate") {
      if (!brand_id || !user_id) {
        return NextResponse.json(
          { error: "brand_id and user_id are required" },
          { status: 400 }
        );
      }

      const code = generateReferralCode();
      const referralCode: ReferralCode = {
        code,
        reward_type: "percentage",
        reward_value: REFERRAL_REWARD_PERCENTAGE,
        uses: 0,
        max_uses: MAX_USES_PER_CODE,
        created_at: new Date().toISOString(),
        brand_id,
        user_id,
      };

      referralCodes.set(code, referralCode);

      return NextResponse.json({
        success: true,
        code: referralCode,
        share_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://routecommerce.com"}/register?ref=${code}`,
      });
    }

    if (action === "validate") {
      const { code } = body;
      if (!code) {
        return NextResponse.json(
          { error: "code is required" },
          { status: 400 }
        );
      }

      const referralCode = referralCodes.get(code);
      if (!referralCode) {
        return NextResponse.json({ valid: false, error: "Invalid code" });
      }

      if (referralCode.uses >= referralCode.max_uses) {
        return NextResponse.json({
          valid: false,
          error: "This code has reached its maximum uses",
        });
      }

      return NextResponse.json({
        valid: true,
        reward_type: referralCode.reward_type,
        reward_value: referralCode.reward_value,
      });
    }

    if (action === "use") {
      const { code, new_user_id } = body;
      if (!code || !new_user_id) {
        return NextResponse.json(
          { error: "code and new_user_id are required" },
          { status: 400 }
        );
      }

      const referralCode = referralCodes.get(code);
      if (!referralCode) {
        return NextResponse.json({ error: "Invalid code" }, { status: 404 });
      }

      if (referralCode.uses >= referralCode.max_uses) {
        return NextResponse.json(
          { error: "Code has reached maximum uses" },
          { status: 400 }
        );
      }

      // Increment usage
      referralCode.uses += 1;
      referralCodes.set(code, referralCode);

      return NextResponse.json({
        success: true,
        reward_type: referralCode.reward_type,
        reward_value: referralCode.reward_value,
        discount: `${referralCode.reward_value}% off first month`,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Referral API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}