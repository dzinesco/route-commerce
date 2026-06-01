import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-permissions";
import { getAIClient } from "@/actions/integrations/ai-providers";

export async function POST(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!adminUser.can_manage_messages) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { brandId, stopId, stopName, stopDate, city, state, recentOrders, customerCount } = await req.json();

    if (!brandId || !stopName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

    const SYSTEM = `You are a marketing strategist for a B2B produce wholesale platform.
Given a stop's order history and customer data, recommend the optimal stop blast message.
Return JSON with exact shape:
{
  "timingRecommendation": "e.g., 'Send 2 days before the stop, between 9-11am for best open rates'",
  "subjectLine": "email subject line",
  "bodyPreview": "2-3 sentence email body preview",
  "audienceSize": "estimated number of recipients",
  "audienceRecommendation": "who should receive this (e.g., 'all pickup customers for this stop' or 'customers who ordered from this stop in last 90 days')",
  "contentAngles": [
    {
      "angle": "e.g., 'Freshness angle'",
      "reasoning": "why this angle works for this stop"
    },
    {
      "angle": "e.g., 'Urgency/discount angle'",
      "reasoning": "why this angle works"
    }
  ],
  "warnings": ["potential issue 1"]
}`;

    const userMessage = `Brand: ${effectiveBrandId}
Stop: ${stopName}
Date: ${stopDate ?? "unknown"}
City: ${city ?? ""}, ${state ?? ""}
Recent Orders: ${JSON.stringify(recentOrders ?? [])}
Customer Count: ${customerCount ?? "unknown"}

Analyze this stop's context and order history to recommend the optimal stop blast message.
Return JSON with timingRecommendation, subjectLine, bodyPreview, audienceSize, audienceRecommendation, contentAngles array, and warnings.`;

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