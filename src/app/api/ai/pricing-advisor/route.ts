import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-permissions";
import { getAIClient } from "@/actions/integrations/ai-providers";

export async function POST(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!adminUser.can_manage_reports) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { brandId, productName, currentPriceTiers, historicalSales } = await req.json();

    if (!brandId) {
      return NextResponse.json({ error: "Missing brandId" }, { status: 400 });
    }

    // Brand scoping
    const effectiveBrandId = adminUser.brand_id ?? brandId ?? null;
    if (!effectiveBrandId) {
      return NextResponse.json({ error: "Brand ID required" }, { status: 400 });
    }
    if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
      return NextResponse.json({ error: "Not authorized for this brand" }, { status: 403 });
    }

    const aiResult = await getAIClient(effectiveBrandId);
    if (!aiResult.client || !("client" in aiResult)) {
      return NextResponse.json({ error: "error" in aiResult ? (aiResult as { error?: string }).error ?? "AI not configured" : "AI not configured" }, { status: 503 });
    }

    const SYSTEM = `You are a pricing strategist for a B2B produce wholesale platform.
Given product sales data, recommend price adjustments with reasoning and estimated revenue impact.
Return JSON with exact shape:
{
  "currentState": "brief description of current pricing situation",
  "recommendations": [
    {
      "productName": "product name",
      "currentPrice": number,
      "suggestedPrice": number,
      "direction": "increase" | "decrease" | "maintain",
      "reasoning": "why this change",
      "estimatedRevenueImpact": "±$X or 'minimal'"
    }
  ],
  "opportunities": ["high-level opportunity 1", "opportunity 2"],
  "warnings": ["potential issue 1"]
}`;

    const userMessage = `Brand: ${effectiveBrandId}
Product: ${productName ?? "unknown"}
Current Price Tiers: ${JSON.stringify(currentPriceTiers ?? [])}
Historical Sales (last 30-90 days): ${JSON.stringify(historicalSales ?? [])}

Analyze pricing and return JSON with currentState, recommendations array, opportunities, and warnings.`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = aiResult.client as { chat: { completions: { create: (opts: unknown) => Promise<{ choices: Array<{ message: { content: string } }> }> } } };
    const response = await client.chat.completions.create({
      model: aiResult.model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(content));
  } catch (err) {
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }
}