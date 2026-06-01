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
    const { brandId, stops, startLocation } = await req.json();

    if (!brandId || !stops || !Array.isArray(stops) || stops.length < 2) {
      return NextResponse.json({ error: "Need at least 2 stops to optimize" }, { status: 400 });
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

    const SYSTEM = `You are a route optimization assistant for a B2B produce wholesale platform.
Given a list of stops with city/state/address and constraints, return an optimized delivery sequence.
Return JSON with this exact shape:
{
  "optimizedSequence": [
    {
      "position": 1,
      "stopName": "Stop A",
      "city": "Greeley",
      "state": "CO",
      "reason": "why placed here (e.g., 'nearest to start point', 'time window constraint')"
    }
  ],
  "totalEstimatedDistance": "X miles",
  "totalEstimatedDriveTime": "X hours Y minutes",
  "warnings": ["issue 1"],
  "suggestions": ["improvement 1"]
}`;

    const stopsList = stops.map((s: { name?: string; city?: string; state?: string; address?: string; time_window?: string }, i: number) =>
      `${i + 1}. ${s.name ?? "Stop"} — ${s.city ?? ""}, ${s.state ?? ""} ${s.address ? "(" + s.address + ")" : ""} ${s.time_window ? "[window: " + s.time_window + "]" : ""}`
    ).join("\n");

    const userMessage = `Brand: ${effectiveBrandId}
Start location: ${startLocation ?? "First stop"}
Stops to sequence:
${stopsList}

Optimize the route for efficiency. Return JSON with optimizedSequence, totalEstimatedDistance, totalEstimatedDriveTime, warnings, and suggestions.`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = aiResult.client as { chat: { completions: { create: (opts: unknown) => Promise<{ choices: Array<{ message: { content: string } }> }> } } };
    const response = await client.chat.completions.create({
      model: aiResult.model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
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