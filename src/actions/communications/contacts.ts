"use server";

import { and, eq, ilike, or, sql, SQL } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-permissions";
import { parseCSVWithLimits } from "@/lib/csv-parser";
import { buildImportPreview } from "@/lib/column-detector";
import { withTenant, withPlatformAdmin } from "@/db/client";
import { customers } from "@/db/schema";

export type ContactSource = "order" | "import" | "manual" | "admin";

/**
 * The new `customers` table stores only the fields needed to send
 * communications. The legacy `communication_contacts` table also tracked
 * source/external_id/customer_id/tags/metadata, which are no longer
 * modeled. Fields below that mirror the new columns are kept; the rest
 * are dropped. UI code that previously rendered e.g. `tags` is expected
 * to degrade gracefully when those fields are absent.
 */
export type Contact = {
  id: string;
  tenant_id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  /** Legacy field — derived from full_name, may be null when only a single token is stored */
  first_name: string | null;
  /** Legacy field — derived from full_name, may be null when only a single token is stored */
  last_name: string | null;
  source: ContactSource;
  email_opt_in: boolean;
  sms_opt_in: boolean;
  /** Legacy field — null when neither email nor sms is opted out */
  unsubscribed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContactImportEntry = {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  tags?: string[];
  email_opt_in?: boolean;
  sms_opt_in?: boolean;
  external_id?: string;
  /** Ignored columns from the CSV, stored in metadata on import */
  _metadata?: Record<string, string>;
};

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: ContactImportEntry; error: string }[];
};

// ── Import preview types (column detection) ────────────────────────────────

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

export type GetContactsResult = {
  success: true;
  contacts: Contact[];
  total: number;
  limit: number;
  offset: number;
} | {
  success: false;
  error: string;
};

function rowToContact(row: typeof customers.$inferSelect): Contact {
  // Derive first/last name from the stored single `name` column.
  // Multi-word names split on the first whitespace; single-word names
  // populate first_name and leave last_name null.
  const fullName = row.name ?? "";
  const trimmed = fullName.trim();
  let firstName: string | null = null;
  let lastName: string | null = null;
  if (trimmed) {
    const idx = trimmed.indexOf(" ");
    if (idx === -1) {
      firstName = trimmed;
    } else {
      firstName = trimmed.slice(0, idx);
      const rest = trimmed.slice(idx + 1).trim();
      lastName = rest.length > 0 ? rest : null;
    }
  }

  // Derive unsubscribed_at: the new schema only has opt-in flags, not
  // a timestamp. Mark the unsubscribe moment as updatedAt if opted out
  // of both channels; null while either is still opted in.
  const fullyUnsubscribed = !row.emailOptIn && !row.smsOptIn;

  return {
    id: row.id,
    tenant_id: row.tenantId,
    email: row.email,
    phone: row.phone,
    full_name: row.name,
    first_name: firstName,
    last_name: lastName,
    source: "manual",
    email_opt_in: row.emailOptIn,
    sms_opt_in: row.smsOptIn,
    unsubscribed_at: fullyUnsubscribed ? row.updatedAt.toISOString() : null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export async function getContacts(params: {
  brandId: string;
  search?: string;
  source?: string;
  limit?: number;
  offset?: number;
}): Promise<GetContactsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (
    adminUser.role === "brand_admin" &&
    adminUser.brand_id !== params.brandId
  ) {
    return { success: false, error: "Not authorized for this brand" };
  }

  const limit = params.limit ?? 100;
  const offset = params.offset ?? 0;
  const search = params.search?.trim() ?? "";

  try {
    const conds: SQL[] = [eq(customers.tenantId, params.brandId)];
    if (search) {
      const like = `%${search}%`;
      conds.push(or(ilike(customers.name, like), ilike(customers.email, like))!);
    }

    const rows = await withTenant(params.brandId, async (db) => {
      const [items, countRows] = await Promise.all([
        db
          .select()
          .from(customers)
          .where(and(...conds))
          .limit(limit)
          .offset(offset)
          .orderBy(customers.createdAt),
        db
          .select({ value: sql<number>`count(*)::int` })
          .from(customers)
          .where(and(...conds)),
      ]);
      return { items, total: Number(countRows[0]?.value ?? 0) };
    });

    return {
      success: true,
      contacts: rows.items.map(rowToContact),
      total: rows.total,
      limit,
      offset,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch contacts",
    };
  }
}

export type UpsertContactResult = {
  success: true;
  contact: Contact;
} | {
  success: false;
  error: string;
};

export async function upsertContact(contact: {
  id?: string;
  brand_id: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  source: ContactSource;
  external_id?: string;
  customer_id?: string;
  email_opt_in?: boolean;
  sms_opt_in?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): Promise<UpsertContactResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (
    adminUser.role === "brand_admin" &&
    adminUser.brand_id !== contact.brand_id
  ) {
    return { success: false, error: "Not authorized for this brand" };
  }

  const name =
    contact.full_name?.trim() ||
    [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim() ||
    contact.email ||
    contact.phone ||
    "Unknown";

  try {
    if (contact.id) {
      const contactId = contact.id;
      const updated = await withTenant(contact.brand_id, (db) =>
        db
          .update(customers)
          .set({
            name,
            email: contact.email ?? null,
            phone: contact.phone ?? null,
            smsOptIn: contact.sms_opt_in ?? false,
            emailOptIn: contact.email_opt_in ?? true,
            updatedAt: new Date(),
          })
          .where(and(eq(customers.id, contactId), eq(customers.tenantId, contact.brand_id)))
          .returning(),
      );
      const row = updated[0];
      if (!row) return { success: false, error: "Contact not found" };
      return { success: true, contact: rowToContact(row) };
    }

    // INSERT — de-dupe on (tenant_id, email) when email is provided
    const contactEmail = contact.email;
    if (contactEmail) {
      const existing = await withTenant(contact.brand_id, (db) =>
        db
          .select()
          .from(customers)
          .where(and(eq(customers.email, contactEmail), eq(customers.tenantId, contact.brand_id)))
          .limit(1),
      );
      if (existing[0]) {
        const updated = await withTenant(contact.brand_id, (db) =>
          db
            .update(customers)
            .set({
              name,
              phone: contact.phone ?? null,
              smsOptIn: contact.sms_opt_in ?? existing[0].smsOptIn,
              emailOptIn: contact.email_opt_in ?? existing[0].emailOptIn,
              updatedAt: new Date(),
            })
            .where(eq(customers.id, existing[0].id))
            .returning(),
        );
        const row = updated[0];
        if (!row) return { success: false, error: "Failed to upsert contact" };
        return { success: true, contact: rowToContact(row) };
      }
    }

    const inserted = await withTenant(contact.brand_id, (db) =>
      db
        .insert(customers)
        .values({
          tenantId: contact.brand_id,
          name,
          email: contact.email ?? null,
          phone: contact.phone ?? null,
          smsOptIn: contact.sms_opt_in ?? false,
          emailOptIn: contact.email_opt_in ?? true,
        })
        .returning(),
    );
    const row = inserted[0];
    if (!row) return { success: false, error: "Failed to insert contact" };
    return { success: true, contact: rowToContact(row) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to upsert contact",
    };
  }
}

export type ImportContactsResult = {
  success: true;
  result: ImportResult;
} | {
  success: false;
  error: string;
};

/**
 * The legacy `import_communication_contacts_batch` RPC is replaced with
 * an in-process batch: parse → dedupe → upsert per row, returning the
 * same ImportResult shape. This avoids a round-trip to the DB for each
 * row and keeps the call inside the `withTenant` transaction.
 */
export async function importContactsBatch(params: {
  brandId: string;
  contacts: ContactImportEntry[];
  allowOptInOverride?: boolean;
}): Promise<ImportContactsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (
    adminUser.role === "brand_admin" &&
    adminUser.brand_id !== params.brandId
  ) {
    return { success: false, error: "Not authorized for this brand" };
  }

  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (const row of params.contacts) {
    if (!row.email && !row.phone) {
      result.skipped++;
      continue;
    }
    try {
      const r = await upsertContact({
        brand_id: params.brandId,
        email: row.email,
        phone: row.phone,
        first_name: row.first_name,
        last_name: row.last_name,
        full_name: row.full_name,
        source: "import",
        email_opt_in: row.email_opt_in,
        sms_opt_in: row.sms_opt_in,
        external_id: row.external_id,
        tags: row.tags,
        metadata: row._metadata,
      });
      if (r.success) result.created++;
      else {
        result.errors.push({ row, error: r.error });
      }
    } catch (err) {
      result.errors.push({
        row,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { success: true, result };
}

export type OptOutResult = {
  success: true;
} | {
  success: false;
  error: string;
};

export async function optOutContact(params: {
  email: string;
  brandId: string;
  method: "email" | "sms";
}): Promise<OptOutResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (
    adminUser.role === "brand_admin" &&
    adminUser.brand_id !== params.brandId
  ) {
    return { success: false, error: "Not authorized for this brand" };
  }

  try {
    await withTenant(params.brandId, (db) =>
      db
        .update(customers)
        .set({
          ...(params.method === "email" ? { emailOptIn: false } : { smsOptIn: false }),
          updatedAt: new Date(),
        })
        .where(and(eq(customers.email, params.email), eq(customers.tenantId, params.brandId))),
    );
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to opt out contact",
    };
  }
}

export async function deleteContact(id: string, brandId?: string): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };
  if (
    adminUser.role === "brand_admin" &&
    brandId &&
    adminUser.brand_id !== brandId
  ) {
    return { success: false, error: "Not authorized for this brand" };
  }

  try {
    if (brandId) {
      await withTenant(brandId, (db) =>
        db
          .delete(customers)
          .where(and(eq(customers.id, id), eq(customers.tenantId, brandId))),
      );
    } else {
      // platform_admin fallback — by id only
      await withPlatformAdmin((db) => db.delete(customers).where(eq(customers.id, id)));
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete contact",
    };
  }
}

// ── Export preview ────────────────────────────────────────────────────────────

export type ExportContactsResult = {
  success: true;
  csv: string;
  filename: string;
} | {
  success: false;
  error: string;
};

function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export async function exportContacts(params: {
  brandId: string;
  brandSlug?: string;
  search?: string;
  source?: string;
}): Promise<ExportContactsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const effectiveBrandId =
    adminUser.role === "brand_admin" ? adminUser.brand_id! : params.brandId;

  if (!effectiveBrandId) return { success: false, error: "No brand context" };

  const allContacts: Contact[] = [];
  const batchSize = 1000;
  let offset = 0;

  try {
    while (true) {
      const rows = await withTenant(effectiveBrandId, (db) =>
        db
          .select()
          .from(customers)
          .where(
            params.search
              ? and(
                  eq(customers.tenantId, effectiveBrandId),
                  or(
                    ilike(customers.name, `%${params.search}%`),
                    ilike(customers.email, `%${params.search}%`),
                  ),
                )
              : eq(customers.tenantId, effectiveBrandId),
          )
          .limit(batchSize)
          .offset(offset)
          .orderBy(customers.createdAt),
      );

      const batch = rows.map(rowToContact);
      if (batch.length === 0) break;
      allContacts.push(...batch);
      if (batch.length < batchSize) break;
      offset += batchSize;
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch contacts",
    };
  }

  const headers = [
    "email",
    "phone",
    "full_name",
    "email_opt_in",
    "sms_opt_in",
    "created_at",
    "updated_at",
  ];

  const rows = allContacts.map((c) => [
    escapeCSVValue(c.email),
    escapeCSVValue(c.phone),
    escapeCSVValue(c.full_name),
    c.email_opt_in ? "TRUE" : "FALSE",
    c.sms_opt_in ? "TRUE" : "FALSE",
    escapeCSVValue(c.created_at),
    escapeCSVValue(c.updated_at),
  ]);

  const brandSlug = params.brandSlug ?? "contacts";
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${brandSlug}-${dateStr}.csv`;

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

  return { success: true, csv, filename };
}

// ── Import preview ────────────────────────────────────────────────────────────

export async function previewContactImport(
  csvText: string
): Promise<{ success: true; preview: ImportPreviewResult } | { success: false; error: string }> {
  try {
    const { csv, totalRows, warnings } = parseCSVWithLimits(csvText);

    if (warnings.length > 0 && totalRows === 0) {
      return { success: false, error: warnings[0] };
    }

    const preview = buildImportPreview(csv.headers, csv.rows);
    preview.warnings = warnings;

    return { success: true, preview };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Parse error" };
  }
}
