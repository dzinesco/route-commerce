"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { assertBrandAccess } from "@/lib/brand-scope";
import { parseExcelBuffer, parseTextBuffer } from "@/lib/excel-parser";
import { importProductsBatch } from "@/actions/import-products";
import { importOrdersBatch } from "@/actions/import-orders";
import { createStopsBatch } from "@/actions/stops";
import { importContactsBatch } from "@/actions/communications/contacts";

export type ImportEntityType = "products" | "orders" | "contacts" | "stops" | "unknown";

export type ColumnMapping = Record<string, string>; // header → semantic field

export type ImportAnalysis = {
  detectedType: ImportEntityType;
  confidence: number;
  columnMappings: ColumnMapping;
  cleanedRows: Record<string, unknown>[];
  rawRows: string[][];
  headers: string[];
  rowCount: number;
  warnings: string[];
  autoFixApplied: string[];
};

export type AnalyzeImportResult =
  | { success: true; analysis: ImportAnalysis }
  | { success: false; error: string };

export type ExecuteImportResult =
  | { success: true; created: number; updated: number; errors: { row: number; message: string }[] }
  | { success: true; imported: number; errors: { row: number; message: string }[] }
  | { success: false; error: string };

// ── Analyze ─────────────────────────────────────────────────────────────────

export async function analyzeImport(
  base64Data: string,
  fileName: string,
  brandId: string
): Promise<AnalyzeImportResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  try {
    assertBrandAccess(adminUser, brandId);
  } catch {
    return { success: false, error: "Not authorized for this brand" };
  }

  // Decode file
  let rawText: string;
  try {
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    rawText = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return { success: false, error: "Could not decode file" };
  }

  // Parse based on file type
  let headers: string[];
  let rows: string[][];

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["xlsx", "xls"].includes(ext)) {
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const buf = Buffer.from(bytes);
    const parsed = await parseExcelBuffer(buf);
    headers = parsed.headers;
    rows = parsed.rows;
  } else {
    const parsed = parseTextBuffer(rawText);
    headers = parsed.headers;
    rows = parsed.rows;
  }

  if (headers.length === 0 || rows.length === 0) {
    return { success: false, error: "File appears to be empty" };
  }

  if (rows.length > 5000) {
    return { success: false, error: "File too large. Max 5,000 rows." };
  }

  // Call AI to analyze
  const analysis = await callAIAnalysis(headers, rows, brandId);
  return { success: true, analysis };
}

// ── Execute ──────────────────────────────────────────────────────────────────

export async function executeImport(
  brandId: string,
  detectedType: ImportEntityType,
  rows: Record<string, unknown>[]
): Promise<ExecuteImportResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  switch (detectedType) {
    case "products":
      return executeProductsImport(brandId, rows);
    case "orders":
      return executeOrdersImport(brandId, rows);
    case "stops":
      return executeStopsImport(brandId, rows);
    case "contacts":
      return executeContactsImport(brandId, rows);
    default:
      return { success: false, error: `Import type "${detectedType}" not yet supported in Import Center` };
  }
}

// ── AI Core ──────────────────────────────────────────────────────────────────

async function callAIAnalysis(
  headers: string[],
  rows: string[][],
  brandId: string
): Promise<ImportAnalysis> {
  // Prefer MiniMax (env-level) — the team is using it pre-launch. Fall back to OpenAI.
  const provider: "minimax" | "openai" =
    process.env.MINIMAX_API_KEY ? "minimax" : process.env.OPENAI_API_KEY ? "openai" : "openai";
  const apiKey = provider === "minimax" ? process.env.MINIMAX_API_KEY! : process.env.OPENAI_API_KEY!;
  const baseURL = provider === "minimax"
    ? (process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1")
    : "https://api.openai.com/v1";
  const model = provider === "minimax" ? "MiniMax-M3" : "gpt-4o-mini";

  // Build sample rows (first 30 for token economy)
  const sampleRows = rows.slice(0, 30);
  const sampleText = [headers.join(","), ...sampleRows.map((r) => r.join(","))].join("\n");

  // Non-AI fallback parser for comparison
  const { columnMappings: fallbackMappings, cleanedRows: fallbackRows, warnings } = fallbackParse(headers, rows);

  if (!apiKey) {
    // No AI key — use rule-based fallback
    return {
      detectedType: fallbackMappings["__entity_type"] as ImportEntityType ?? "unknown",
      confidence: 0.5,
      columnMappings: fallbackMappings,
      cleanedRows: fallbackRows,
      rawRows: rows,
      headers,
      rowCount: rows.length,
      warnings,
      autoFixApplied: [],
    };
  }

  // Compose AI prompt
  const systemPrompt = `You are a data import analyst for a B2B produce wholesale platform called Route Commerce.
Given CSV-like data with headers and sample rows, respond ONLY with valid JSON (no markdown, no explanation):
{
  "detectedType": "products" | "orders" | "contacts" | "stops" | "unknown",
  "confidence": 0.0-1.0,
  "columnMappings": { "Header Name": "semantic_field", ... },
  "cleanedRows": [ { "field": "value", ... }, ... ],
  "warnings": ["row N: issue description", ...],
  "autoFixApplied": ["description of fixes applied", ...]
}

Semantic fields:
- products: product_name, price, description, product_type (Pickup|Shipping|Pickup & Shipping), active (true|false), image_url
- orders: customer_name, customer_email, customer_phone, stop_id, product_name (or product_id), quantity, fulfillment (Pickup|Shipping)
- contacts: email, phone, first_name, last_name, full_name, tags, email_opt_in (true|false), sms_opt_in (true|false), external_id
- stops: city, state, location (business name or address), date (YYYY-MM-DD), time (HH:MM), address, zip, notes

Rules:
- Normalize phone numbers to (XXX) XXX-XXXX format
- Normalize email to lowercase
- Trim whitespace from all values
- For prices: keep as number string, flag non-numeric
- For dates: normalize to YYYY-MM-DD
- Set confidence 0.9+ only if clear match
- Map columns by HEADER NAME (exact key in columnMappings), not by position
- cleanedRows: return max 50 sample rows — full import uses the same mapping
- If ambiguous columns exist (e.g. two "email" candidates), pick the one with more populated values
- Do NOT add __entity_type to cleanedRows — only in columnMappings output`;

  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Headers: ${headers.join(", ")}\n\nData (first 30 rows):\n${sampleText.slice(0, 6000)}` },
        ],
        // Note: response_format is OpenAI-specific. MiniMax /v1/chat/completions supports
        // JSON-style prompting but may not honor `json_object`. We omit it for MiniMax.
        ...(provider === "openai" ? { response_format: { type: "json_object" } } : {}),
        temperature: 0.1,
      }),
    });

    if (!res.ok) throw new Error(`${provider} error: ${res.status}`);

    const data = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content as string);

    return {
      detectedType: parsed.detectedType ?? "unknown",
      confidence: parsed.confidence ?? 0.5,
      columnMappings: parsed.columnMappings ?? {},
      cleanedRows: parsed.cleanedRows ?? fallbackRows,
      rawRows: rows,
      headers,
      rowCount: rows.length,
      warnings: parsed.warnings ?? [],
      autoFixApplied: parsed.autoFixApplied ?? [],
    };
  } catch (err) {
    // Fall back to rule-based parsing
    return {
      detectedType: fallbackMappings["__entity_type"] as ImportEntityType ?? "unknown",
      confidence: 0.4,
      columnMappings: fallbackMappings,
      cleanedRows: fallbackRows,
      rawRows: rows,
      headers,
      rowCount: rows.length,
      warnings: [`AI parse failed, using rule-based fallback: ${String(err)}`],
      autoFixApplied: [],
    };
  }
}

// ── Rule-Based Fallback Parser ────────────────────────────────────────────────

function fallbackParse(
  headers: string[],
  rows: string[][]
): { columnMappings: ColumnMapping; cleanedRows: Record<string, unknown>[]; warnings: string[] } {
  const h = headers.map((h) => h.toLowerCase().trim());

  // Score each header for each entity type
  const typeScores: Record<string, number> = { products: 0, orders: 0, contacts: 0, stops: 0 };

  const productKeywords = ["name", "product", "price", "cost", "description", "type", "active", "image"];
  const orderKeywords = ["customer", "email", "phone", "order", "stop", "product", "quantity", "fulfillment", "item"];
  const contactKeywords = ["contact", "first", "last", "name", "email", "phone", "opt", "sms", "tag", "external"];
  const stopKeywords = ["city", "state", "location", "address", "date", "time", "pickup", "stop", "zip", "notes"];

  const keywordMaps: Record<string, string[]> = {
    products: productKeywords,
    orders: orderKeywords,
    contacts: contactKeywords,
    stops: stopKeywords,
  };

  for (const header of h) {
    for (const [etype, keywords] of Object.entries(keywordMaps)) {
      for (const kw of keywords) {
        if (header.includes(kw)) typeScores[etype] = (typeScores[etype] ?? 0) + 1;
      }
    }
  }

  const detectedType = (Object.entries(typeScores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown") as ImportEntityType;

  // Map headers to semantic fields
  const columnMappings: ColumnMapping = {};
  const semanticMap: Record<string, string[]> = {
    product_name: ["product_name", "name", "product", "item", "goods_name", "item_name", "item name", "title", "product name", "merchandise"],
    price: ["price", "cost", "retail_price", "unit_price", "sale_price", "amount", "product_price"],
    description: ["description", "desc", "product_desc", "long_description", "details", "product_description"],
    product_type: ["product_type", "type", "category", "product_category", "fulfillment_type", "fulfillment", "shipping_type", "delivery_type"],
    active: ["active", "available", "in_stock", "is_active", "enabled", "published", "is_available"],
    image_url: ["image_url", "image", "photo", "picture", "img_url", "product_image", "pic"],
    customer_name: ["customer_name", "name", "customer", "buyer_name", "ordered_by", "purchaser", "buyer"],
    customer_email: ["customer_email", "email", "buyer_email", "e-mail", "email_address", "customer e-mail"],
    customer_phone: ["customer_phone", "phone", "telephone", "mobile", "cell", "phone_number", "contact", "tel"],
    stop_id: ["stop_id", "stop", "pickup_location", "location_id", "stop id", "route_id", "schedule_id"],
    quantity: ["quantity", "qty", "amount", "count", "units", "number_of_items", "item_count"],
    fulfillment: ["fulfillment", "fulfillment_type", "delivery_method", "ship_or_pickup", "shipping_method", "fulfill", "delivery", "shipping"],
    product_id: ["product_id", "item_id", "sku", "item_number", "product id", "item number"],
    first_name: ["first_name", "first", "firstName", "fname"],
    last_name: ["last_name", "last", "lastName", "lname"],
    full_name: ["full_name", "name", "customer_name"],
    tags: ["tags", "tag", "segments", "segment", "labels"],
    email_opt_in: ["email_opt_in", "opt_in_email", "email_opt", "emailoptin"],
    sms_opt_in: ["sms_opt_in", "opt_in_sms", "sms_opt", "smsoptin"],
    external_id: ["external_id", "externalid", "id", "reference", "external_id"],
    city: ["city", "town", "locality"],
    state: ["state", "st", "province"],
    location: ["location", "pickup_location", "venue", "place", "business", "name", "location_name"],
    date: ["date", "pickup_date", "delivery_date", "stop_date", "date_of_stop"],
    time: ["time", "pickup_time", "start_time", "window", "hours", "pickup_hours"],
    address: ["address", "street_address", "street", "addr"],
    zip: ["zip", "zipcode", "postal_code", "postal", "zip_code"],
    notes: ["notes", "note", "special_instructions", "comments", "memo", "instruction"],
  };

  for (let i = 0; i < h.length; i++) {
    const header = h[i];
    for (const [field, keywords] of Object.entries(semanticMap)) {
      if (keywords.some((kw) => header.includes(kw))) {
        columnMappings[headers[i]] = field;
      }
    }
  }

  columnMappings["__entity_type"] = detectedType;

  // Build cleaned rows
  const cleanedRows = rows.map((row) => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < row.length; i++) {
      const header = headers[i];
      const field = columnMappings[header];
      if (field && field !== "__entity_type") {
        let val = row[i]?.trim() ?? "";
        // Normalize
        if (field === "price") val = val.replace(/[^0-9.]/g, "");
        if (field === "email_opt_in" || field === "sms_opt_in") val = val.toLowerCase();
        obj[field] = val;
      }
    }
    return obj;
  });

  return { columnMappings, cleanedRows, warnings: [] };
}

// ── Import Executors ─────────────────────────────────────────────────────────

async function executeProductsImport(brandId: string, rows: Record<string, unknown>[]) {
  const products = rows.map((r) => ({
    name: String(r.product_name ?? r.name ?? ""),
    description: String(r.description ?? ""),
    price: parseFloat(String(r.price ?? "0").replace(/[^0-9.]/g, "")) || 0,
    type: normalizeFulfillmentType(String(r.product_type ?? r.type ?? "Pickup")),
    active: String(r.active ?? "true").toLowerCase() !== "false",
    image_url: r.image_url ? String(r.image_url) : undefined,
  })).filter((p) => p.name !== "");

  const result = await importProductsBatch(brandId, products);
  if (!result.success) {
    return { success: false, error: result.error } as ExecuteImportResult;
  }
  return {
    success: true as const,
    created: result.created,
    updated: result.updated,
    errors: result.errors.map((e) => ({ row: 0, message: e.error })),
  };
}

async function executeOrdersImport(brandId: string, rows: Record<string, unknown>[]) {
  // Group rows by customer+stop (merge multi-item rows)
  const orderMap: Record<string, { customer_name: string; customer_email: string; customer_phone: string; stop_id: string; items: { product_id: string; quantity: number; fulfillment: string }[] }> = {};

  for (const row of rows) {
    const key = `${row.customer_email}_${row.stop_id}`;
    if (!orderMap[key]) {
      orderMap[key] = {
        customer_name: String(row.customer_name ?? ""),
        customer_email: String(row.customer_email ?? ""),
        customer_phone: String(row.customer_phone ?? ""),
        stop_id: String(row.stop_id ?? ""),
        items: [],
      };
    }
    if (row.product_id || row.product_name) {
      orderMap[key].items.push({
        product_id: String(row.product_id ?? ""),
        quantity: parseInt(String(row.quantity ?? "1")) || 1,
        fulfillment: normalizeFulfillmentType(String(row.fulfillment ?? "Pickup")),
      });
    }
  }

  const orders = Object.values(orderMap)
    .filter((o) => o.customer_email && o.stop_id)
    .map((o) => ({
      customer_name: o.customer_name || "",
      customer_email: o.customer_email,
      customer_phone: o.customer_phone || "",
      stop_id: o.stop_id,
      items: o.items,
    }));

  return importOrdersBatch(brandId, orders).then((r) => {
    if (r.success) {
      return {
        success: true as const,
        imported: r.imported as number,
        errors: (r.errors as Array<{ row: number; error: string }>).map((e) => ({ row: e.row ?? 0, message: e.error ?? String(e) })),
      };
    }
    return { success: false, error: r.error as string };
  }) as Promise<ExecuteImportResult>;
}

async function executeStopsImport(brandId: string, rows: Record<string, unknown>[]) {
  const stops = rows.map((r) => ({
    city: String(r.city ?? ""),
    state: String(r.state ?? ""),
    location: String(r.location ?? r.address ?? ""),
    date: normalizeDate(String(r.date ?? "")),
    time: String(r.time ?? ""),
    address: r.address ? String(r.address) : undefined,
    zip: r.zip ? String(r.zip) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
  })).filter((s) => s.city !== "" && s.state !== "");

  return createStopsBatch(brandId, stops).then((r) => {
    if (r.success) {
      return { success: true as const, created: r.created as number, updated: 0, errors: [] };
    }
    return { success: false, error: r.error as string };
  }) as Promise<ExecuteImportResult>;
}

async function executeContactsImport(brandId: string, rows: Record<string, unknown>[]) {
  const contacts = rows.map((r) => ({
    email: r.email ? String(r.email).toLowerCase().trim() : undefined,
    phone: r.phone ? String(r.phone).trim() : undefined,
    first_name: r.first_name ? String(r.first_name).trim() : undefined,
    last_name: r.last_name ? String(r.last_name).trim() : undefined,
    full_name: r.full_name ? String(r.full_name).trim() : undefined,
    tags: r.tags ? String(r.tags).split(",").map((t: string) => t.trim()) : [],
    email_opt_in: r.email_opt_in !== undefined ? String(r.email_opt_in).toLowerCase() === "true" : true,
    sms_opt_in: r.sms_opt_in !== undefined ? String(r.sms_opt_in).toLowerCase() === "true" : false,
    external_id: r.external_id ? String(r.external_id).trim() : undefined,
  })).filter((c) => c.email || c.phone);

  const result = await importContactsBatch({ brandId, contacts });
  if (!result.success) {
    return { success: false, error: result.error } as ExecuteImportResult;
  }
  return {
    success: true as const,
    created: result.result.created,
    updated: result.result.updated,
    errors: result.result.errors.map((e) => ({ row: 0, message: e.error ?? "Unknown error" })),
  };
}

// ── Normalizers ──────────────────────────────────────────────────────────────

function normalizeFulfillmentType(t: string): string {
  const lower = t.toLowerCase().replace(/[^a-z]/g, "");
  if (lower.includes("pickup") && lower.includes("ship")) return "Pickup & Shipping";
  if (lower.includes("ship")) return "Shipping";
  return "Pickup";
}

function normalizeDate(dateStr: string): string {
  if (!dateStr) return "";
  // Try common formats
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  // Try MM/DD/YYYY
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const [, m, d2] = parts;
    if (m && d2) {
      const normalized = new Date(`${parts[2]}-${m.padStart(2, "0")}-${d2.padStart(2, "0")}`);
      if (!isNaN(normalized.getTime())) return normalized.toISOString().split("T")[0];
    }
  }
  return dateStr;
}