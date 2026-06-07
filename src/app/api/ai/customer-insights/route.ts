import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-permissions";
import { getAIClient } from "@/actions/integrations/ai-providers";
import { pool } from "@/lib/db";

const SYSTEM = `You are a data analyst for a B2B produce wholesale platform.
Given a natural language customer query, return a JSON response indicating which predefined query to run and what parameters to use.

Query types (each has a predefined SQL template):
1. "dormant" — customers who haven't ordered in X days (parameter: days, default 45)
2. "trending" — products ordered most in the last N days (parameter: days, default 30)
3. "top_customers" — top customers by order total in last N days (parameter: days, default 90)
4. "recent_orders" — orders created in last N days (parameter: days, default 14)
5. "at_risk" — customers who had orders in past 90 days but none in last 30 days

Return JSON with:
{
  "queryType": "dormant" | "trending" | "top_customers" | "recent_orders" | "at_risk",
  "days": number (or null for at_risk which always uses 30/90),
  "explanation": "plain English explanation of what this query will return",
  "fallback": "plain language result if AI analysis fails"
}`;

export async function POST(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!adminUser.can_manage_reports) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { brandId, nlQuery } = await req.json();

    if (!brandId || !nlQuery) {
      return NextResponse.json({ error: "Missing brandId or nlQuery" }, { status: 400 });
    }

    // Brand scoping: platform_admin passes explicit brandId; brand_admin limited to own brand
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

    const userMessage = `Brand: ${effectiveBrandId}
User asked: "${nlQuery}"

Classify this query and return JSON with queryType, days, explanation, and fallback.
Use "at_risk" for customers who had orders in past 90 days but none in last 30 days.
Use "dormant" for customers who haven't ordered in a while.
Use "trending" for product popularity questions.
Use "top_customers" for customer ranking questions.
Use "recent_orders" for recent order questions.`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = aiResult.client as { chat: { completions: { create: (opts: unknown) => Promise<{ choices: Array<{ message: { content: string } }> }> } } };
    const response = await client.chat.completions.create({
      model: aiResult.model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const parsed = JSON.parse(content);
    const queryType = parsed.queryType ?? "recent_orders";
    const days = parsed.days ?? 30;

    // Route to appropriate RPC based on query type
    let rpcName = "get_recent_orders_insights";
    let rpcArgs: unknown[] = [effectiveBrandId, days];

    if (queryType === "dormant") {
      rpcName = "get_dormant_customers_insights";
      rpcArgs = [effectiveBrandId, days];
    } else if (queryType === "trending") {
      rpcName = "get_trending_products_insights";
      rpcArgs = [effectiveBrandId, days];
    } else if (queryType === "top_customers") {
      rpcName = "get_top_customers_insights";
      rpcArgs = [effectiveBrandId, days];
    } else if (queryType === "at_risk") {
      rpcName = "get_at_risk_customers_insights";
      rpcArgs = [effectiveBrandId];
    }

    let results: unknown[] = [];
    try {
      const { rows } = await pool.query(
        `SELECT ${rpcName}(${rpcArgs.map((_, i) => `$${i + 1}`).join(", ")}) AS result`,
        rpcArgs,
      );
      const data = rows[0]?.result;
      results = Array.isArray(data) ? data.slice(0, 100) : [];
    } catch {
      results = [];
    }

    return NextResponse.json({
      queryType,
      explanation: parsed.explanation ?? "",
      results,
      count: results.length,
      fallback: parsed.fallback ?? "",
      nlQuery,
    });
  } catch (err) {
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }
}
