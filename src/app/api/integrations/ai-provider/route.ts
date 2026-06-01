import { NextRequest, NextResponse } from "next/server";
import { getAIProviderSettings, setAIProviderSettings } from "@/actions/integrations/ai-providers";
import { getAdminUser } from "@/lib/admin-permissions";

export async function GET(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!adminUser.can_manage_settings) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  let brandId = searchParams.get("brandId");

  const effectiveBrandId = adminUser.brand_id ?? brandId ?? null;
  if (!effectiveBrandId) {
    return NextResponse.json({ error: "Brand ID required" }, { status: 400 });
  }
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return NextResponse.json({ error: "Not authorized for this brand" }, { status: 403 });
  }

  brandId = effectiveBrandId;
  const settings = await getAIProviderSettings(brandId);
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!adminUser.can_manage_settings) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { brandId, provider, apiKey, orgId, model, customEndpoint } = await req.json();

    const effectiveBrandId = adminUser.brand_id ?? brandId ?? null;
    if (!effectiveBrandId) {
      return NextResponse.json({ error: "Brand ID required" }, { status: 400 });
    }
    if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
      return NextResponse.json({ error: "Not authorized for this brand" }, { status: 403 });
    }

    const result = await setAIProviderSettings(effectiveBrandId, { provider, apiKey, orgId, model, customEndpoint });
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}