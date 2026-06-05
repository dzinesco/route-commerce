"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";
import { uploadFile, BUCKETS, storageKeys } from "@/lib/storage";

export type UploadProductImageResult =
  | { success: true; imageUrl: string }
  | { success: false; error: string };

export async function uploadProductImage(
  productId: string,
  file: File
): Promise<UploadProductImageResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const validTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!validTypes.includes(file.type)) {
    return { success: false, error: "Invalid file type. Use PNG, JPEG, or WebP." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "File too large. Max 5MB." };
  }

  const rawExt = file.type.split("/")[1];
  const ext = rawExt === "jpeg" ? "jpg" : rawExt;
  const targetProductId = productId === "__NEW__" ? "new" : productId;
  const key = storageKeys.productImage(targetProductId, ext);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let url: string;
  try {
    const res = await uploadFile({
      bucket: BUCKETS.PRODUCT_IMAGES,
      key,
      body: buffer,
      contentType: file.type,
    });
    url = res.url;
  } catch (e) {
    return { success: false, error: `Upload failed: ${(e as Error).message}` };
  }

  // If productId is "__NEW__", we just upload and return the URL (caller handles saving it)
  if (productId === "__NEW__") {
    return { success: true, imageUrl: url };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const patchRes = await fetch(
    `${supabaseUrl}/rest/v1/products?id=eq.${productId}`,
    {
      method: "PATCH",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: url }),
    }
  );

  if (!patchRes.ok) {
    return { success: false, error: "Upload succeeded but failed to save image URL" };
  }

  return { success: true, imageUrl: url };
}

export async function deleteProductImage(
  productId: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const patchRes = await fetch(
    `${supabaseUrl}/rest/v1/products?id=eq.${productId}`,
    {
      method: "PATCH",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: null }),
    }
  );

  if (!patchRes.ok) {
    return { success: false, error: "Failed to clear image" };
  }

  return { success: true };
}
