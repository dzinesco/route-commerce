import { NextRequest, NextResponse } from "next/server";
import { parseStopCSV } from "@/lib/csv-parsers";
import type { ParsedStopRow } from "@/lib/csv-parsers";
import { getAdminUser } from "@/lib/admin-permissions";

export type ParsedStop = Omit<ParsedStopRow, "_rowIndex" | "_warnings">;

type RequestBody = {
  /** Raw file content (CSV text). AI parsing is attempted if useAI=true. */
  text: string;
  brandId: string;
  /** If true and OPENAI_API_KEY is set, parse unstructured text with AI. */
  useAI?: boolean;
};

const AI_MODEL = "gpt-4o-mini";

async function parseWithAI(text: string, brandId: string): Promise<{
  stops: ParsedStop[];
  warnings: string[];
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured. Use CSV format for reliable parsing.");
  }

  const systemPrompt = `You are a schedule extraction assistant. Given raw schedule text, extract all stop entries.
Return a JSON array where each entry has:
- city: city name (required)
- state: 2-letter state code (required)
- location: descriptive location or address (required)
- date: the stop date in YYYY-MM-DD format if stated, otherwise ""
- time: the pickup time range if stated, otherwise ""
- address: full street address if present, otherwise omit
- zip: ZIP code if present, otherwise omit
- notes: any notes (parking, instructions) if present, otherwise omit

If a row lacks required fields (city, state, location), omit it and add a warning.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extract stops from this schedule:\n\n${text.slice(0, 8000)}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} — ${err}`);
  }

  const data = await res.json();
  const content: unknown = JSON.parse(data.choices[0]?.message?.content ?? "{}");

  // Handle both { stops: [...] } and [ ... ] responses
  let rawStops: unknown[] = [];
  if (Array.isArray(content)) {
    rawStops = content;
  } else if (content && typeof content === "object") {
    const obj = content as Record<string, unknown>;
    if (Array.isArray(obj.stops)) rawStops = obj.stops;
    else if (Array.isArray(obj.entries)) rawStops = obj.entries;
    else if (Array.isArray(obj.rows)) rawStops = obj.rows;
  }

  const stops: ParsedStop[] = [];
  const warnings: string[] = [];

  for (const row of rawStops) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const city = String(r.city ?? "").trim();
    const state = String(r.state ?? "").trim();
    const location = String(r.location ?? "").trim();

    if (!city || !state || !location) {
      warnings.push(`Skipped row: missing required fields — ${JSON.stringify(row)}`);
      continue;
    }

    stops.push({
      city,
      state,
      location,
      date: String(r.date ?? "").trim(),
      time: String(r.time ?? "").trim(),
      address: r.address ? String(r.address).trim() : undefined,
      zip: r.zip ? String(r.zip).trim() : undefined,
      notes: r.notes ? String(r.notes).trim() : undefined,
    });
  }

  return { stops, warnings };
}

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!adminUser.can_manage_stops) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text, brandId, useAI } = body;

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (!brandId || typeof brandId !== "string") {
    return NextResponse.json({ error: "brandId is required" }, { status: 400 });
  }

  const effectiveBrandId = adminUser.brand_id ?? brandId ?? null;
  if (!effectiveBrandId) {
    return NextResponse.json({ error: "Brand ID required" }, { status: 400 });
  }
  if (adminUser.role === "brand_admin" && adminUser.brand_id !== brandId) {
    return NextResponse.json({ error: "Not authorized for this brand" }, { status: 403 });
  }

  // Always try CSV first
  const csvResult = parseStopCSV(text);
  if (csvResult.success && csvResult.rows.length > 0) {
    const stops: ParsedStop[] = csvResult.rows.map((r) => ({
      city: r.city,
      state: r.state,
      location: r.location,
      date: r.date,
      time: r.time,
      address: r.address,
      zip: r.zip,
      notes: r.notes,
    }));
    const warnings = [
      ...csvResult.errors.map((e) => `Row ${e.row}: ${e.error}`),
      ...csvResult.rows.flatMap((r) => r._warnings),
    ];
    return NextResponse.json({ stops, warnings, source: "csv" });
  }

  // CSV failed or empty — try AI if enabled
  if (useAI) {
    try {
      const { stops, warnings } = await parseWithAI(text, brandId);
      return NextResponse.json({ stops, warnings, source: "ai" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI parsing failed";
      return NextResponse.json(
        { error: msg, stops: [], warnings: [] },
        { status: 422 }
      );
    }
  }

  // No AI and CSV didn't work
  const errorMsg = csvResult.success
    ? "No stops found in file. Check that columns include: city, state, location, date, time."
    : csvResult.error;

  return NextResponse.json({ error: errorMsg, stops: [], warnings: [] }, { status: 422 });
}
