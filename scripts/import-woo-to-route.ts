/**
 * import-woo-to-route.ts - 2026 Season Import
 *
 * Reads Tuxedo_Corn_2026_Tour_Schedule-2.xlsx (Full Tour Schedule sheet) and produces:
 *   products.csv  - 1 core pickup product
 *   stops.csv     - 164 active stops
 *
 * Usage:
 *   npx tsx scripts/import-woo-to-route.ts \
 *     --xlsx "/path/to/Tuxedo_Corn_2026_Tour_Schedule-2.xlsx" \
 *     --brand 64294306-5f42-463d-a5e8-2ad6c81a96de \
 *     --output ./import-output
 */

import * as fs from "fs";
import * as path from "path";
import { parseArgs } from "util";
import ExcelJS from "exceljs";

// Types

interface ProductOutput {
  name: string;
  price: number;
  type: "Pickup" | "Shipping" | "Pickup & Shipping";
  description: string;
  active: boolean;
  image_url: string;
  is_taxable: boolean;
}

interface StopOutput {
  city: string;
  state: string;
  location: string;
  date: string;
  time: string;
  address: string;
  notes: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const args = parseArgs({
    options: {
      xlsx: { type: "string" },
      brand: { type: "string" },
      output: { type: "string", default: "./import-output" },
    },
  });

  const xlsxPath = args.values.xlsx as string;
  const brandId = args.values.brand as string;
  const outputDir = args.values.output as string;

  if (!xlsxPath || !brandId) {
    console.error(
      "Usage: npx tsx scripts/import-woo-to-route.ts --xlsx <path> --brand <uuid> [--output <dir>]"
    );
    process.exit(1);
  }
  if (!fs.existsSync(xlsxPath)) {
    console.error("File not found: " + xlsxPath);
    process.exit(1);
  }

  // Read Excel
  // Row 0=title, Row1=subtitle, Row2=color-key, Row3=column-headers, Row4+=data
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const sheet = wb.getWorksheet(1);
  if (!sheet) {
    console.error("No worksheet found in file");
    process.exit(1);
  }

  const allRows: (string | null | undefined)[][] = [];
  sheet.eachRow((row) => {
    allRows.push(row.values as (string | null | undefined)[]);
  });

  const colHeaders = (allRows[3] as string[]).map((h: unknown) => String(h ?? "").trim());
  console.log("Column headers:", colHeaders);

  const ci = (col: string) => colHeaders.indexOf(col);
  const wkIdx = ci("Wk"), typeIdx = ci("Type"), datesIdx = ci("Dates"), dayIdx = ci("Day");
  const cityIdx = ci("City / Location"), hostIdx = ci("Host / Venue");
  const timeIdx = ci("Time"), truckIdx = ci("Truck"), statusIdx = ci("Status"), notesIdx = ci("Notes");

  interface ScheduleRow {
    wk: number; type: string; dates: string; day: string;
    city: string; host: string; time: string; truck: string; status: string; notes: string;
  }

  const scheduleRows: ScheduleRow[] = [];
  let currentWeek: { wk: number; type: string; dates: string; day: string } | null = null;

  for (let i = 4; i < allRows.length; i++) {
    const row = allRows[i] as (string | null | undefined)[];
    if (!row) continue;

    const wkVal = row[wkIdx];
    const Day = String(row[dayIdx] ?? "").trim();
    const City_Location = String(row[cityIdx] ?? "").trim();
    const Status = String(row[statusIdx] ?? "").trim();

    if (wkVal !== null && wkVal !== undefined && String(wkVal).trim() !== "") {
      currentWeek = {
        wk: Number(wkVal),
        type: String(row[typeIdx] ?? "").trim(),
        dates: String(row[datesIdx] ?? "").trim(),
        day: Day,
      };
    }

    if (!currentWeek) continue;
    if (Status === "Off day") continue;
    if (!City_Location) continue;

    scheduleRows.push({
      wk: currentWeek.wk, type: currentWeek.type, dates: currentWeek.dates,
      day: Day || currentWeek.day,
      city: City_Location,
      host: String(row[hostIdx] ?? "").trim(),
      time: String(row[timeIdx] ?? "").trim(),
      truck: String(row[truckIdx] ?? "").trim(),
      status: Status,
      notes: String(row[notesIdx] ?? "").trim(),
    });
  }

  const ACTIVE_STATUSES = ["✓ Confirmed", "🔴 Pre-sale live"];
  const activeRows = scheduleRows.filter((r) => ACTIVE_STATUSES.includes(r.status));
  console.log("\nSchedule rows: " + scheduleRows.length + " total | " + activeRows.length + " active\n");

  // PRODUCTS -- one core product for all stops
  const products: ProductOutput[] = [
    {
      name: "Olathe Sweet Corn -- 24 Ear Box",
      price: 25,
      type: "Pickup",
      description:
        "Fresh Olathe Sweet Corn pickup box. Add to cart, then choose your pickup stop at checkout. " +
        "Available July-September 2026 at stops across Colorado, Wyoming, and New Mexico. " +
        "See tuxedocorn.com for full schedule.",
      active: true,
      image_url:
        "https://tuxedocorn.com/wp-content/uploads/2024/06/110260317_3494904527187819_6983832261179080791_n-1.jpg",
      is_taxable: true,
    },
  ];

  console.log("[products] 1 core product: \"" + products[0].name + "\" at $" + products[0].price + "\n");

  // STOPS -- one row per active schedule entry
  const stops: StopOutput[] = [];
  const seenStopKeys = new Set<string>();

  for (const row of activeRows) {
    if (!row.city) continue;

    // Parse "City ST" or "City, ST" -> city + state
    const cityRaw = row.city.replace(/--/g, "-").trim();
    let city = cityRaw, state = "CO";

    if (cityRaw.includes(",")) {
      const parts = cityRaw.split(",").map((s: string) => s.trim());
      const lastPart = parts[parts.length - 1] ?? "";
      if (/^[A-Z]{2}$/.test(lastPart)) { city = parts.slice(0, -1).join(", ").trim(); state = lastPart; }
      else city = parts.join(", ");
    } else {
      const tokens = cityRaw.split(/\s+/);
      const lastToken = tokens[tokens.length - 1] ?? "";
      if (/^[A-Z]{2}$/.test(lastToken)) { state = lastToken; city = tokens.slice(0, -1).join(" "); }
    }

    const stopKey = slugify(city + "-" + state + "-" + row.dates + "-" + row.time);
    if (seenStopKeys.has(stopKey)) continue;
    seenStopKeys.add(stopKey);

    // Human-readable stop label = "Store (Time) | Truck T1"
    const stopName = row.host + " (" + row.time + ")" + (row.truck ? " | Truck " + row.truck : "");

    stops.push({
      city,
      state,
      location: stopName,
      date: row.dates,  // week range -- set actual date in /admin/stops after import
      time: row.time,
      address: row.city + " | " + row.host,
      notes: row.day + (row.notes ? " | " + row.notes : ""),
    });
  }

  console.log("[stops] " + stops.length + " stops written\n");

  // Show sample by week
  const byWeek: Record<string, typeof stops> = {};
  for (const s of stops) {
    if (!byWeek[s.date]) byWeek[s.date] = [];
    byWeek[s.date].push(s);
  }
  const weeks = Object.keys(byWeek).slice(0, 4);
  for (const week of weeks) {
    const ws = byWeek[week];
    console.log("  " + week + " (" + ws.length + " stops):");
    for (const s of ws.slice(0, 3)) {
      console.log("    " + s.city + ", " + s.state + " | \"" + s.location + "\" | " + s.time);
    }
  }

  // Write output CSVs
  fs.mkdirSync(outputDir, { recursive: true });

  function writeCSV(filename: string, header: string, rows: string[][]) {
    const lines = rows.map((r) =>
      r.map((c) => "\"" + String(c ?? "").replace(/\"/g, "\"\"") + "\"").join(",")
    );
    fs.writeFileSync(path.join(outputDir, filename), header + lines.join("\n"));
  }

  writeCSV(
    "products.csv",
    "name,price,type,description,active,image_url,is_taxable\n",
    products.map((p) => [
      p.name, String(p.price), p.type, p.description,
      String(p.active), p.image_url, String(p.is_taxable),
    ])
  );

  writeCSV(
    "stops.csv",
    "city,state,location,date,time,address,notes\n",
    stops.map((s) => [s.city, s.state, s.location, s.date, s.time, s.address, s.notes])
  );

  // Summary
  console.log("\n============================================================");
  console.log("IMPORT READY");
  console.log("============================================================");
  console.log("\nproducts.csv: 1 product (\"" + products[0].name + "\" @ $" + products[0].price + " Pickup)");
  console.log("stops.csv:    " + stops.length + " stops (confirmed + pre-sale only)");
  console.log("\nOutput:      " + outputDir + "/");
  console.log("");
  console.log(">>> NOTE: stops.csv 'date' field is a WEEK RANGE (e.g. Jul 22-28).");
  console.log("After importing stops, visit /admin/stops to set the actual date for each stop.");
  console.log("");
  console.log("NEXT STEPS:");
  console.log("  1. Upload " + outputDir + "/products.csv via /admin/import -> type: products");
  console.log("  2. Upload " + outputDir + "/stops.csv via /admin/import -> type: stops");
  console.log("  3. Visit /admin/stops -- set each stop's actual date, verify address/time");
  console.log("  4. Visit /tuxedo -- verify product and stops appear\n");
  console.log("Re-run: npx tsx scripts/import-woo-to-route.ts --xlsx \"" + xlsxPath + "\" --brand " + brandId + " --output " + outputDir + "\n");
}

main().catch(console.error);
