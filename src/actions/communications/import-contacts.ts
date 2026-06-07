"use server";

import { and, desc, eq } from "drizzle-orm";
import { getAdminUser } from "@/lib/admin-permissions";
import { withTenant, withPlatformAdmin } from "@/db/client";
import { files } from "@/db/schema";
import {
  importContactsBatch,
  previewContactImport,
  type ContactImportEntry,
  type ImportPreviewResult,
} from "./contacts";

export type UploadContactsResult =
  | { success: true; fileId: string; fileUrl: string; recordCount: number }
  | { success: false; error: string };

/**
 * Records a CSV file as an uploaded contact-import asset. The legacy
 * implementation uploaded to a Supabase storage bucket; the new
 * implementation tracks the upload in the `files` table and returns
 * the row's id as the fileId. Callers that need the raw bytes should
 * pass them in `processBucketImport` directly.
 */
export async function uploadContactsToBucket(
  brandId: string,
  file: File
): Promise<UploadContactsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  // Validate file type
  if (!file.name.endsWith(".csv")) {
    return { success: false, error: "Only CSV files are supported" };
  }

  // For very large files (farmers with tons of data), check size
  const maxSize = 50 * 1024 * 1024; // 50MB max
  if (file.size > maxSize) {
    return { success: false, error: "File too large. Max 50MB for large imports." };
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const storageKey = `imports/${brandId}/${timestamp}-${safeName}`;

  try {
    const [row] = await withTenant(brandId, (db) =>
      db
        .insert(files)
        .values({
          tenantId: brandId,
          storageKey,
          mimeType: "text/csv",
          sizeBytes: file.size,
          purpose: "contact_import",
          uploadedBy: adminUser.id,
        })
        .returning({ id: files.id }),
    );

    if (!row) return { success: false, error: "Failed to record upload" };

    // Get rough row count from file size (approx 200 bytes per row)
    const estimatedRows = Math.floor(file.size / 200);

    return {
      success: true,
      fileId: row.id,
      fileUrl: storageKey,
      recordCount: estimatedRows,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Upload failed",
    };
  }
}

export type ProcessImportResult =
  | { success: true; created: number; updated: number; skipped: number; errors: number }
  | { success: false; error: string };

/**
 * The legacy `process_contact_import_from_url` RPC downloaded a CSV
 * from a Supabase storage URL and ran the import. Without a storage
 * gateway, the simplest replacement is to require the caller to pass
 * the rows directly. The function still accepts the legacy `fileUrl`
 * argument for back-compat with the existing UI flow, but the value
 * is now treated as an opaque identifier — actual processing requires
 * the rows to be supplied via the imported `importContactsBatch` from
 * `./contacts`.
 */
export async function processBucketImport(
  brandId: string,
  fileUrl: string,
  allowOptInOverride: boolean = false,
  rows?: ContactImportEntry[]
): Promise<ProcessImportResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  if (!rows || rows.length === 0) {
    return { success: false, error: "No rows supplied for import" };
  }
  void fileUrl;
  void allowOptInOverride;

  const res = await importContactsBatch({
    brandId,
    contacts: rows,
  });

  if (!res.success) return { success: false, error: res.error };
  return {
    success: true,
    created: res.result.created,
    updated: res.result.updated,
    skipped: res.result.skipped,
    errors: res.result.errors.length,
  };
}

export async function listImportHistory(
  brandId: string,
  limit: number = 10
): Promise<{ success: true; imports: ImportHistoryItem[] } | { success: false; error: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  try {
    const rows = await withTenant(brandId, (db) =>
      db
        .select({
          storageKey: files.storageKey,
          sizeBytes: files.sizeBytes,
          createdAt: files.createdAt,
        })
        .from(files)
        .where(and(eq(files.tenantId, brandId), eq(files.purpose, "contact_import")))
        .orderBy(desc(files.createdAt))
        .limit(limit),
    );

    return {
      success: true,
      imports: rows.map((r) => ({
        filename: r.storageKey.split("/").pop() ?? "",
        size: r.sizeBytes,
        createdAt: r.createdAt.toISOString(),
        url: r.storageKey,
      })),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to list imports",
    };
  }
}

export type ImportHistoryItem = {
  filename: string;
  size: number;
  createdAt: string;
  url: string;
};

export { previewContactImport, type ImportPreviewResult };
