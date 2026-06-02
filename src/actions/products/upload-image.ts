"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

// Product images bucket - UUID from Supabase
const PRODUCT_IMAGES_BUCKET_ID = "80aa01da-ab4b-44f8-b6e7-700552457e18";

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

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `products/${productId}/${crypto.randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const uploadRes = await fetch(
    `${supabaseUrl}/storage/v1/object/${PRODUCT_IMAGES_BUCKET_ID}/${path}`,
    {
      method: "PUT",
      headers: { ...svcHeaders(supabaseKey), "Authorization": `Bearer ${supabaseKey}`, "Content-Type": `image/${ext}`, "x-upsert": "true" },
      body: buffer,
    }
  );

  if (!uploadRes.ok) {
    return { success: false, error: `Upload failed: ${await uploadRes.text()}` };
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET_ID}/${path}`;

  // If productId is "__NEW__", we just upload and return the URL (caller handles saving it)
  if (productId === "__NEW__") {
    return { success: true, imageUrl: publicUrl };
  }

  // Update product record with new image URL
  const patchRes = await fetch(
    `${supabaseUrl}/rest/v1/products?id=eq.${productId}`,
    {
      method: "PATCH",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: publicUrl }),
    }
  );

  if (!patchRes.ok) {
    return { success: false, error: "Upload succeeded but failed to save image URL" };
  }

  return { success: true, imageUrl: publicUrl };
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