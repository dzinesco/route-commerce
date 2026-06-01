import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-permissions";
import { getAIClient } from "@/actions/integrations/ai-providers";

export async function POST(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!adminUser.can_manage_products) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { productName, category, price, unit, brandId } = await req.json();
  if (!productName) {
    return NextResponse.json({ error: "productName is required" }, { status: 400 });
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

  const systemPrompt = `You are a product copywriter for Route Commerce, a B2B fresh produce wholesale platform.
Given a product, write: a product name (can improve on input), a marketing description (2-3 sentences, persuasive, highlights freshness/origin/quality), image alt text (max 125 chars, SEO-friendly), and a brief pricing note if relevant.

Return valid JSON: { "name": "...", "description": "...", "altText": "...", "priceNote": "..." (or null) }

Brand voice: friendly, transparent, professional.
Audience: wholesale buyers, restaurant owners, farm stand operators.`;

  try {
    const client = aiResult.client as { chat: { completions: { create: (opts: unknown) => Promise<{ choices: Array<{ message: { content: string } }> }> } } };
    const response = await client.chat.completions.create({
      model: aiResult.model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            `Product: ${productName}`,
            category ? `Category: ${category}` : "",
            price ? `Price: ${price}${unit ? ` ${unit}` : ""}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const parsed = JSON.parse(content);
    return NextResponse.json({
      name: parsed.name ?? productName,
      description: parsed.description ?? "",
      altText: parsed.altText ?? "",
      priceNote: parsed.priceNote ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}