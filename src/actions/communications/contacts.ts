"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";
import { parseCSVWithLimits } from "@/lib/csv-parser";
import { buildImportPreview } from "@/lib/column-detector";

export type ContactSource = "order" | "import" | "manual" | "admin";

export type Contact = {
  id: string;
  brand_id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  source: ContactSource;
  external_id: string | null;
  customer_id: string | null;
  email_opt_in: boolean;
  sms_opt_in: boolean;
  email_opt_in_at: string | null;
  sms_opt_in_at: string | null;
  unsubscribed_at: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_communication_contacts`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: params.brandId,
        p_search: params.search ?? null,
        p_source: params.source ?? null,
        p_limit: params.limit ?? 100,
        p_offset: params.offset ?? 0,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to fetch contacts" };
  const data = await response.json();

  return {
    success: true,
    contacts: data?.contacts ?? [],
    total: data?.total ?? 0,
    limit: data?.limit ?? 100,
    offset: data?.offset ?? 0,
  };
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/upsert_communication_contact`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_id: contact.id ?? null,
        p_brand_id: contact.brand_id,
        p_email: contact.email ?? null,
        p_phone: contact.phone ?? null,
        p_first_name: contact.first_name ?? null,
        p_last_name: contact.last_name ?? null,
        p_full_name: contact.full_name ?? null,
        p_source: contact.source,
        p_external_id: contact.external_id ?? null,
        p_customer_id: contact.customer_id ?? null,
        p_email_opt_in: contact.email_opt_in ?? null,
        p_sms_opt_in: contact.sms_opt_in ?? null,
        p_tags: contact.tags ?? null,
        p_metadata: contact.metadata ?? null,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to upsert contact" };
  const data = await response.json();

  if (!data) return { success: false, error: "No data returned" };
  return { success: true, contact: data as Contact };
}

export type ImportContactsResult = {
  success: true;
  result: ImportResult;
} | {
  success: false;
  error: string;
};

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/import_communication_contacts_batch`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: params.brandId,
        p_contacts: params.contacts,
        p_allow_opt_in_override: params.allowOptInOverride ?? false,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to import contacts" };
  const data = await response.json();

  return { success: true, result: data as ImportResult };
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/opt_out_contact`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_email: params.email,
        p_brand_id: params.brandId,
        p_method: params.method,
      }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to opt out contact" };
  return { success: true };
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/delete_communication_contact`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ p_id: id }),
    }
  );

  if (!response.ok) return { success: false, error: "Failed to delete contact" };
  const data = await response.json();
  return { success: data };
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const allContacts: Contact[] = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_communication_contacts`,
      {
        method: "POST",
        headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
        body: JSON.stringify({
          p_brand_id: effectiveBrandId,
          p_search: params.search ?? null,
          p_source: params.source ?? null,
          p_limit: batchSize,
          p_offset: offset,
        }),
      }
    );

    if (!response.ok) return { success: false, error: "Failed to fetch contacts" };
    const data = await response.json();
    const batch: Contact[] = data?.contacts ?? [];

    if (batch.length === 0) break;
    allContacts.push(...batch);
    if (batch.length < batchSize) break;
    offset += batchSize;
  }

  const headers = [
    "email",
    "phone",
    "first_name",
    "last_name",
    "full_name",
    "source",
    "email_opt_in",
    "sms_opt_in",
    "unsubscribed_at",
    "tags",
    "created_at",
    "updated_at",
    "customer_id",
    "metadata.last_order_id",
    "metadata.last_order_at",
    "metadata.stop_id",
    "metadata.imported_raw",
  ];

  const rows = allContacts.map((c) => [
    escapeCSVValue(c.email),
    escapeCSVValue(c.phone),
    escapeCSVValue(c.first_name),
    escapeCSVValue(c.last_name),
    escapeCSVValue(c.full_name),
    escapeCSVValue(c.source),
    c.email_opt_in ? "TRUE" : "FALSE",
    c.sms_opt_in ? "TRUE" : "FALSE",
    escapeCSVValue(c.unsubscribed_at),
    escapeCSVValue(c.tags?.join(";")),
    escapeCSVValue(c.created_at),
    escapeCSVValue(c.updated_at),
    escapeCSVValue(c.customer_id),
    escapeCSVValue((c.metadata as Record<string, unknown>)?.last_order_id ?? ""),
    escapeCSVValue((c.metadata as Record<string, unknown>)?.last_order_at ?? ""),
    escapeCSVValue((c.metadata as Record<string, unknown>)?.stop_id ?? ""),
    escapeCSVValue((c.metadata as Record<string, unknown>)?.imported_raw ?? ""),
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