"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";
import { uploadFile, listFiles, BUCKETS, publicUrl, storageKeys } from "@/lib/storage";

export type UploadContactsResult =
  | { success: true; fileId: string; fileUrl: string; recordCount: number }
  | { success: false; error: string };

export async function uploadContactsToBucket(
  brandId: string,
  file: File
): Promise<UploadContactsResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  if (!file.name.endsWith(".csv")) {
    return { success: false, error: "Only CSV files are supported" };
  }

  const maxSize = 50 * 1024 * 1024; // 50MB max
  if (file.size > maxSize) {
    return { success: false, error: "File too large. Max 50MB for large imports." };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = storageKeys.contactsImport(brandId, safeName);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let url: string;
  try {
    const res = await uploadFile({
      bucket: BUCKETS.CONTACTS_IMPORTS,
      key,
      body: buffer,
      contentType: "text/csv",
    });
    url = res.url;
  } catch (e) {
    return { success: false, error: `Upload failed: ${(e as Error).message}` };
  }

  const fileId = key.split("/").slice(0, 2).join("/"); // brandId/timestamp
  const estimatedRows = Math.floor(file.size / 200);

  return {
    success: true,
    fileId,
    fileUrl: url,
    recordCount: estimatedRows,
  };
}

export type ProcessImportResult =
  | { success: true; created: number; updated: number; skipped: number; errors: number }
  | { success: false; error: string };

export async function processBucketImport(
  brandId: string,
  fileUrl: string,
  allowOptInOverride: boolean = false
): Promise<ProcessImportResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/process_contact_import_from_url`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: brandId,
        p_file_url: fileUrl,
        p_allow_opt_in_override: allowOptInOverride,
      }),
    }
  );

  if (!response.ok) {
    return { success: false, error: `Processing failed: ${await response.text()}` };
  }

  const data = await response.json();
  return {
    success: true,
    created: data.created ?? 0,
    updated: data.updated ?? 0,
    skipped: data.skipped ?? 0,
    errors: data.errors ?? 0,
  };
}

export async function listImportHistory(
  brandId: string,
  limit: number = 10
): Promise<{ success: true; imports: ImportHistoryItem[] } | { success: false; error: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  try {
    const files = await listFiles(BUCKETS.CONTACTS_IMPORTS, `${brandId}/`);
    return {
      success: true,
      imports: files.slice(0, limit).map((f) => ({
        filename: f.key.split("/").pop() ?? "",
        size: f.size,
        createdAt: f.lastModified.toISOString(),
        url: publicUrl(BUCKETS.CONTACTS_IMPORTS, f.key),
      })),
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export type ImportHistoryItem = {
  filename: string;
  size: number;
  createdAt: string;
  url: string;
};
