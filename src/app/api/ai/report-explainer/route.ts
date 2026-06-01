import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-permissions";
import { getAIClient } from "@/actions/integrations/ai-providers";

const REPORT_PROMPTS: Record<string, string> = {
  "orders-by-stop": `This is an Orders by Stop report. Each row has: stop_name, city, state, date, order_count, gross_sales, pending_count, completed_count. Identify top-performing stops, underperforming stops, and patterns in pending vs completed orders.`,
  "sales-by-product": `This is a Sales by Product report. Each row has: product_name, units_sold, gross_revenue, avg_price. Identify top sellers, underperformers, and pricing anomalies. Flag any products with unusually high/low average prices.`,
  "fulfillment": `This is a Fulfillment Breakdown report. Each row has: fulfillment_type (pickup/shipping), order_count, revenue, pct_of_total. Analyze pickup vs shipping split and revenue distribution.`,
  "pickup-status": `This is a Pickup Status report. Each row has: stop_name, city, date, total_orders, pending, completed, canceled. Identify stops with high pending rates, high cancellation rates, and completion speed.`,
  "contact-growth": `This is a Contact Growth report. Each row has: date, new_contacts, imports, total. Identify growth trends, import spikes, and rate-of-change patterns.`,
  "campaigns": `This is a Campaign Activity report. Each row has: campaign_name, status, campaign_type, sent_at, messages_logged. Identify which campaign types perform best, timing patterns, and engagement levels.`,
};

const SYSTEM = `You are a data analyst for a B2B produce wholesale distribution platform.
You analyze report data and return structured insights in plain English.
Always be specific and cite numbers from the data.
Format your response as JSON with this exact shape:
{
  "summary": "2-3 sentence plain-English summary of what this report shows",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "suggestedActions": ["action 1", "action 2"]
}
Be direct and actionable. Do not use hedging language.`;

export async function POST(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!adminUser.can_manage_reports) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { reportType, dateRange, brandId, reportData } = await req.json();

    if (!reportType || !reportData) {
      return NextResponse.json({ error: "Missing reportType or reportData" }, { status: 400 });
    }

    // Brand scoping: platform_admin passes explicit brandId; brand_admin limited to own brand
    const effectiveBrandId = adminUser.brand_id ?? brandId ?? null;
    if (!effectiveBrandId) {
      return NextResponse.json({ error: "Brand ID required" }, { status: 400 });
    }

    const aiResult = await getAIClient(effectiveBrandId);
    if (!aiResult.client || !("client" in aiResult)) {
      return NextResponse.json({ error: "error" in aiResult ? (aiResult as { error?: string }).error ?? "AI not configured" : "AI not configured" }, { status: 503 });
    }

    const prompt = REPORT_PROMPTS[reportType] ?? `This is a ${reportType} report. Analyze it.`;

    // Build a compact sample of rows (max 20 for token efficiency)
    const sampleRows = Array.isArray(reportData) ? reportData.slice(0, 20) : [];

    const userMessage = `Date range: ${dateRange?.start ?? "unknown"} to ${dateRange?.end ?? "unknown"}
Brand: ${effectiveBrandId}
${prompt}

Data:
${JSON.stringify(sampleRows, null, 2)}

Return JSON with summary, keyInsights (array), and suggestedActions (array).`;

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