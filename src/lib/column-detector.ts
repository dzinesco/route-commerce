import type { ContactImportEntry } from "@/actions/communications/contacts";
import { normalizePhone, normalizeEmail } from "./csv-parser";

// ── Column name variant lists ────────────────────────────────────────────────

const EMAIL_COLUMNS = new Set([
  "email",
  "emailaddress",
  "email_address",
  "e-mail",
  "contactemail",
  "contact email",
  "customeremail",
  "customer email",
]);

const PHONE_COLUMNS = new Set([
  "phone",
  "phonenumber",
  "phone_number",
  "mobilephone",
  "mobile",
  "cell",
  "cellphone",
  "smsphone",
  "sms phone",
  "customerphone",
  "customer phone",
  "telephone",
  "tel",
]);

const FIRST_NAME_COLUMNS = new Set([
  "firstname",
  "first_name",
  "fname",
  "givenname",
  "given name",
]);

const LAST_NAME_COLUMNS = new Set([
  "lastname",
  "last_name",
  "lname",
  "surname",
  "familyname",
  "family name",
]);

const FULL_NAME_COLUMNS = new Set([
  "name",
  "fullname",
  "full_name",
  "contactname",
  "contact name",
  "customername",
  "customer name",
]);

const TAGS_COLUMNS = new Set([
  "tags",
  "tag",
  "groups",
  "segment",
  "segments",
  "audience",
  "category",
  "categories",
  "label",
  "labels",
]);

const EMAIL_OPT_IN_COLUMNS = new Set([
  "emailoptin",
  "email_opt_in",
  "subscribed",
  "email subscribed",
  "subscriptionstatus",
  "subscription status",
  "marketingpermission",
  "marketing permission",
  "acceptsmarketing",
  "accepts marketing",
  "emailmarketingconsent",
  "email marketing consent",
  "emailconsent",
  "marketing_email",
]);

const SMS_OPT_IN_COLUMNS = new Set([
  "smsoptin",
  "sms_opt_in",
  "smssubscribed",
  "sms subscribed",
  "smsmarketing",
  "sms marketing",
  "smsconsent",
  "sms_consent",
  "smsmarketingconsent",
  "mobileoptin",
  "mobile_opt_in",
]);

const EXTERNAL_ID_COLUMNS = new Set([
  "externalid",
  "external_id",
  "shopifyid",
  "shopify_id",
  "woo_id",
  "quickbooksid",
  "quickbooks_id",
  "customer_id",
]);

// ── Normalization ────────────────────────────────────────────────────────────

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[_\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type ImportField =
  | "email"
  | "phone"
  | "first_name"
  | "last_name"
  | "full_name"
  | "tags"
  | "email_opt_in"
  | "sms_opt_in"
  | "external_id"
  | null;

export type ColumnMapping = {
  csvColumn: string;
  field: ImportField;
  sampleValues: string[];
};

const FIELD_COLUMNS: Record<string, Set<string>> = {
  email: EMAIL_COLUMNS,
  phone: PHONE_COLUMNS,
  first_name: FIRST_NAME_COLUMNS,
  last_name: LAST_NAME_COLUMNS,
  full_name: FULL_NAME_COLUMNS,
  tags: TAGS_COLUMNS,
  email_opt_in: EMAIL_OPT_IN_COLUMNS,
  sms_opt_in: SMS_OPT_IN_COLUMNS,
  external_id: EXTERNAL_ID_COLUMNS,
};

export function detectColumnMappings(
  headers: string[],
  rows: string[][]
): ColumnMapping[] {
  const mappings: ColumnMapping[] = headers.map((csvColumn) => {
    const normalized = normalizeHeader(csvColumn);
    let field: ImportField = null;
    let bestScore = 0;

    for (const [f, variants] of Object.entries(FIELD_COLUMNS)) {
      // Exact normalized match
      if (variants.has(normalized)) {
        const score = 1;
        if (score > bestScore) {
          bestScore = score;
          field = f as ImportField;
        }
      }
    }

    return { csvColumn, field, sampleValues: [] };
  });

  // Collect sample values and handle disambiguation
  for (const mapping of mappings) {
    const colIdx = headers.indexOf(mapping.csvColumn);
    if (colIdx === -1 || mapping.field === null) continue;

    const samples: string[] = [];
    for (const row of rows) {
      const val = row[colIdx] ?? "";
      if (val !== "" && samples.length < 3) {
        samples.push(val);
      }
    }
    mapping.sampleValues = samples;
  }

  // Disambiguation: if two columns mapped to same field, keep the one with more samples
  const fieldCounts = new Map<string, ColumnMapping[]>();
  for (const m of mappings) {
    if (m.field !== null) {
      if (!fieldCounts.has(m.field)) fieldCounts.set(m.field, []);
      fieldCounts.get(m.field)!.push(m);
    }
  }

  for (const [, ms] of fieldCounts) {
    if (ms.length > 1) {
      ms.sort((a, b) => b.sampleValues.length - a.sampleValues.length);
      for (let i = 1; i < ms.length; i++) {
        ms[i].field = null; // demote secondary matches
      }
    }
  }

  return mappings;
}

export function mapRowToContactEntry(
  row: string[],
  mappings: ColumnMapping[]
): {
  entry: ContactImportEntry;
  normalizedEmail: string | null;
  normalizedPhone: string | null;
} {
  const entry: ContactImportEntry = {};
  let normalizedEmail: string | null = null;
  let normalizedPhone: string | null = null;

  for (const mapping of mappings) {
    if (mapping.field === null) continue;
    const colIdx = mappings.indexOf(mapping);
    const raw = row[colIdx] ?? "";

    switch (mapping.field) {
      case "email": {
        const cleaned = normalizeEmail(raw);
        entry.email = cleaned || undefined;
        normalizedEmail = cleaned || null;
        break;
      }
      case "phone": {
        const { normalized, original } = normalizePhone(raw);
        entry.phone = original || undefined;
        normalizedPhone = normalized || null;
        break;
      }
      case "first_name":
        entry.first_name = raw || undefined;
        break;
      case "last_name":
        entry.last_name = raw || undefined;
        break;
      case "full_name":
        entry.full_name = raw || undefined;
        break;
      case "tags":
        entry.tags = raw
          ? raw.split(/[;:,]/).map((t) => t.trim()).filter(Boolean)
          : undefined;
        break;
      case "email_opt_in":
        entry.email_opt_in =
          raw === "true" || raw === "1" || raw === "yes" || raw === "y" || raw === "on";
        break;
      case "sms_opt_in":
        entry.sms_opt_in =
          raw === "true" || raw === "1" || raw === "yes" || raw === "y" || raw === "on";
        break;
      case "external_id":
        entry.external_id = raw || undefined;
        break;
    }
  }

  return { entry, normalizedEmail, normalizedPhone };
}

export type ImportPreviewResult = {
  mappings: ColumnMapping[];
  totalRows: number;
  validRows: number;
  skippedRows: number;
  duplicateRows: number;
  skippedReasons: { rowIndex: number; reason: string }[];
  sampleRows: ContactImportEntry[];
  ignoredColumns: string[];
  warnings: string[];
};

export function buildImportPreview(
  headers: string[],
  rows: string[][]
): ImportPreviewResult {
  const mappings = detectColumnMappings(headers, rows);
  const ignoredColumns = mappings
    .filter((m) => m.field === null)
    .map((m) => m.csvColumn);

  const entries: ContactImportEntry[] = [];
  const skippedReasons: { rowIndex: number; reason: string }[] = [];
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  let duplicateRows = 0;

  for (let i = 0; i < rows.length; i++) {
    const { entry, normalizedEmail, normalizedPhone } = mapRowToContactEntry(rows[i], mappings);

    const hasEmail = !!(normalizedEmail ?? entry.email);
    const hasPhone = !!normalizedPhone;

    if (!hasEmail && !hasPhone) {
      skippedReasons.push({ rowIndex: i, reason: "No email or phone" });
      continue;
    }

    // Dedupe within file
    let isDuplicate = false;
    if (normalizedEmail && seenEmails.has(normalizedEmail)) isDuplicate = true;
    if (normalizedPhone && seenPhones.has(normalizedPhone)) isDuplicate = true;

    if (isDuplicate) {
      duplicateRows++;
      skippedReasons.push({ rowIndex: i, reason: "Duplicate in file" });
      continue;
    }

    if (normalizedEmail) seenEmails.add(normalizedEmail);
    if (normalizedPhone) seenPhones.add(normalizedPhone);
    entries.push(entry);
  }

  return {
    mappings,
    totalRows: rows.length,
    validRows: entries.length,
    skippedRows: rows.length - entries.length,
    duplicateRows,
    skippedReasons,
    sampleRows: entries.slice(0, 5),
    ignoredColumns,
    warnings: [],
  };
}
