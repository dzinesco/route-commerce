// Pure CSV parsing utilities — no server-side logic

export type ParsedProductRow = {
  name: string;
  description: string;
  price: number;
  type: string;
  active: boolean;
  image_url?: string;
  _rowIndex: number;
  _warnings: string[];
};

export function parseProductCSV(csvText: string): {
  success: true;
  rows: ParsedProductRow[];
  totalRows: number;
  errors: { row: number; error: string }[];
} | {
  success: false;
  error: string;
} {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { success: false, error: "CSV must have a header row and at least one data row" };
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const required = ["name", "price", "type"];
  for (const col of required) {
    if (!header.includes(col)) {
      return { success: false, error: `Missing required column: ${col}` };
    }
  }

  const nameIdx = header.indexOf("name");
  const descIdx = header.indexOf("description");
  const priceIdx = header.indexOf("price");
  const typeIdx = header.indexOf("type");
  const activeIdx = header.indexOf("active");
  const imgIdx = header.indexOf("image_url");

  const rows: ParsedProductRow[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const name = cols[nameIdx] ?? "";

    if (!name) {
      errors.push({ row: i + 1, error: "Name is required" });
      continue;
    }

    const priceStr = cols[priceIdx] ?? "";
    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
      errors.push({ row: i + 1, error: `Invalid price: ${priceStr}` });
      continue;
    }

    const type = cols[typeIdx] ?? "";
    if (!["Pickup", "Shipping", "Pickup & Shipping"].includes(type)) {
      errors.push({ row: i + 1, error: `Invalid type: ${type}` });
      continue;
    }

    const active = activeIdx >= 0
      ? (cols[activeIdx]?.toLowerCase() !== "false")
      : true;

    const warnings: string[] = [];
    if (descIdx >= 0 && !cols[descIdx]) warnings.push("description was empty");
    if (imgIdx >= 0 && !cols[imgIdx]) warnings.push("image_url was empty");

    rows.push({
      name,
      description: descIdx >= 0 ? cols[descIdx] ?? "" : "",
      price,
      type,
      active,
      image_url: imgIdx >= 0 ? cols[imgIdx] : undefined,
      _rowIndex: i + 1,
      _warnings: warnings,
    });
  }

  return { success: true, rows, totalRows: lines.length - 1, errors };
}

// ── Stop CSV parser ─────────────────────────────────────────────────────────

export type ParsedStopRow = {
  city: string;
  state: string;
  location: string;
  date: string;
  time: string;
  address?: string;
  zip?: string;
  notes?: string;
  _rowIndex: number;
  _warnings: string[];
};

/**
 * Flexible CSV parser for stop schedules.
 * Auto-detects common column names: city/town, state, location/address,
 * date, time, zip, notes.
 */
export function parseStopCSV(csvText: string): {
  success: true;
  rows: ParsedStopRow[];
  totalRows: number;
  errors: { row: number; error: string }[];
} | {
  success: false;
  error: string;
} {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { success: false, error: "CSV must have a header row and at least one data row" };
  }

  // Build column index map — common synonyms supported
  const rawHeader = lines[0].split(",").map((h) => h.trim());
  const header = rawHeader.map((h) => h.toLowerCase());

  function idx(...names: string[]): number {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  }

  const cityIdx = idx("city", "town", "location");
  const stateIdx = idx("state", "st");
  const locIdx = idx("location", "place", "stop name", "stop", "name");
  const dateIdx = idx("date", "day", "pickup date", "pickupdate");
  const timeIdx = idx("time", "hours", "pickup time", "pickuptime", "time slot");
  const addrIdx = idx("address", "street", "street address", "addr");
  const zipIdx = idx("zip", "zipcode", "zip code", "postal");
  const notesIdx = idx("notes", "note", "instructions", "driver notes");

  const missing = [cityIdx, stateIdx, locIdx, dateIdx, timeIdx].filter((i) => i < 0);
  if (missing.length > 0) {
    return {
      success: false,
      error: "CSV is missing required columns. Need: city, state, location, date, time. Found: " + rawHeader.join(", "),
    };
  }

  const rows: ParsedStopRow[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i].split(",").map((c) => c.trim());

    const city = raw[cityIdx] ?? "";
    const state = raw[stateIdx] ?? "";
    const location = raw[locIdx] ?? "";
    const date = raw[dateIdx] ?? "";
    const time = raw[timeIdx] ?? "";
    const address = addrIdx >= 0 ? raw[addrIdx] : undefined;
    const zip = zipIdx >= 0 ? raw[zipIdx] : undefined;
    const notes = notesIdx >= 0 ? raw[notesIdx] : undefined;

    const warnings: string[] = [];
    if (!city) warnings.push("city is empty");
    if (!state) warnings.push("state is empty");
    if (!location) warnings.push("location is empty");
    if (!date) warnings.push("date is empty");
    if (!time) warnings.push("time is empty");

    rows.push({
      city,
      state,
      location,
      date,
      time,
      address,
      zip,
      notes,
      _rowIndex: i + 1,
      _warnings: warnings,
    });
  }

  return { success: true, rows, totalRows: lines.length - 1, errors };
}

export type ParsedOrderRow = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  stop_id: string;
  items: Array<{ product_id: string; quantity: number; fulfillment: string }>;
  _rowIndex: number;
  _warnings: string[];
};

export function parseOrderCSV(csvText: string): {
  success: true;
  rows: ParsedOrderRow[];
  totalRows: number;
  errors: { row: number; error: string }[];
} | {
  success: false;
  error: string;
} {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { success: false, error: "CSV must have a header row and at least one data row" };
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const required = ["customer_name", "customer_email", "stop_id", "product_id", "quantity", "fulfillment"];
  for (const col of required) {
    if (!header.includes(col)) {
      return { success: false, error: `Missing required column: ${col}` };
    }
  }

  const nameIdx = header.indexOf("customer_name");
  const emailIdx = header.indexOf("customer_email");
  const phoneIdx = header.indexOf("customer_phone");
  const stopIdx = header.indexOf("stop_id");
  const prodIdx = header.indexOf("product_id");
  const qtyIdx = header.indexOf("quantity");
  const fulfillIdx = header.indexOf("fulfillment");

  const rows: ParsedOrderRow[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());

    const customer_name = cols[nameIdx] ?? "";
    const customer_email = cols[emailIdx] ?? "";
    const stop_id = cols[stopIdx] ?? "";
    const product_id = cols[prodIdx] ?? "";
    const quantity = parseInt(cols[qtyIdx] ?? "0", 10);
    const fulfillment = cols[fulfillIdx] ?? "pickup";

    if (!customer_name) {
      errors.push({ row: i + 1, error: "Customer name is required" });
      continue;
    }
    if (!stop_id) {
      errors.push({ row: i + 1, error: "Stop ID is required" });
      continue;
    }
    if (!product_id) {
      errors.push({ row: i + 1, error: "Product ID is required" });
      continue;
    }
    if (isNaN(quantity) || quantity < 1) {
      errors.push({ row: i + 1, error: `Invalid quantity: ${cols[qtyIdx]}` });
      continue;
    }

    rows.push({
      customer_name,
      customer_email,
      customer_phone: phoneIdx >= 0 ? cols[phoneIdx] ?? "" : "",
      stop_id,
      items: [{ product_id, quantity, fulfillment }],
      _rowIndex: i + 1,
      _warnings: [],
    });
  }

  return { success: true, rows, totalRows: lines.length - 1, errors };
}
