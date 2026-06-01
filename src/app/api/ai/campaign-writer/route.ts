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

  const { topic, brandId, brandName } = await req.json();
  if (!topic) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
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
  if (!aiResult.client) {
    return NextResponse.json({ error: "error" in aiResult ? aiResult.error : "AI not configured" }, { status: 503 });
  }

  const systemPrompt = `You are a campaign idea generator for Route Commerce, a B2B fresh produce wholesale platform.
Given a topic, generate exactly 3 campaign ideas for a produce brand.
Each idea should include: angle (one sentence describing the campaign approach), subject line (compelling, max 60 chars), body (3-4 sentences, persuasive, fits brand voice).

Return valid JSON: { "ideas": [{ "angle": "...", "subject": "...", "body": "..." }] }

Brand voice: friendly, transparent, emphasizes freshness and local origin.
Audience: wholesale produce buyers, restaurant owners, farm stand operators.`;

  try {
    const client = aiResult.client as { chat: { completions: { create: (opts: unknown) => Promise<{ choices: Array<{ message: { content: string } }> }> } } };
    const response = await client.chat.completions.create({
      model: aiResult.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Topic: ${topic}\nBrand: ${brandName || "our produce brand"}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const parsed = JSON.parse(content);
    return NextResponse.json({ ideas: parsed.ideas ?? [] });
  } catch (err) {
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}