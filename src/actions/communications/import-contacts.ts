"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

// Contact imports bucket
const CONTACTS_BUCKET_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

export type UploadContactsResult =
  | { success: true; fileId: string; fileUrl: string; recordCount: number }
  | { success: false; error: string };

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Generate unique path
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `imports/${brandId}/${timestamp}-${safeName}`;

  // Upload to bucket
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadRes = await fetch(
    `${supabaseUrl}/storage/v1/object/${CONTACTS_BUCKET_ID}/${path}`,
    {
      method: "PUT",
      headers: {
        ...svcHeaders(supabaseKey),
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "text/csv",
        "x-upsert": "false",
      },
      body: buffer,
    }
  );

  if (!uploadRes.ok) {
    return { success: false, error: `Upload failed: ${await uploadRes.text()}` };
  }

  const fileUrl = `${supabaseUrl}/storage/v1/object/public/${CONTACTS_BUCKET_ID}/${path}`;
  const fileId = `${brandId}/${timestamp}`;

  // Get rough row count from file size (approx 200 bytes per row)
  const estimatedRows = Math.floor(file.size / 200);

  return {
    success: true,
    fileId,
    fileUrl,
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

  // Call RPC to process the file from bucket
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // List files in the imports folder for this brand
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/list/${CONTACTS_BUCKET_ID}`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        prefix: `imports/${brandId}/`,
        limit: limit,
        sortBy: { column: "created_at", order: "desc" },
      }),
    }
  );

  if (!response.ok) {
    return { success: false, error: "Failed to list imports" };
  }

  const files = await response.json();
  return {
    success: true,
    imports: files.map((f: { name: string; metadata: { size: number }; created_at: string }) => ({
      filename: f.name.split("/").pop() ?? "",
      size: f.metadata?.size ?? 0,
      createdAt: f.created_at,
      url: `${supabaseUrl}/storage/v1/object/public/${CONTACTS_BUCKET_ID}/${f.name}`,
    })),
  };
}

export type ImportHistoryItem = {
  filename: string;
  size: number;
  createdAt: string;
  url: string;
};