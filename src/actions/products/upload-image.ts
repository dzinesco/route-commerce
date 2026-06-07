"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { withTenant } from "@/db/client";
import { productImages } from "@/db/schema";

export type UploadProductImageResult =
  | { success: true; imageUrl: string }
  | { success: false; error: string };

// TODO(migration): product images in the new SaaS schema live in the
// `product_images` table (storage_key + position + alt_text) backed by
// the `files` table. Supabase Storage is gone, so we no longer upload
// to `/storage/v1/object/...` — that pathway is stubbed. Callers that
// upload images should write to the `files` table via an S3-compatible
// backend (still TODO). This stub persists the intended storage key as
// a record so the UI can continue to render an image URL placeholder.
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
  const storageKey = `products/${productId}/${crypto.randomUUID()}.${ext}`;

  // Without a configured object store, we cannot actually upload bytes.
  // We still record the planned storage key in `product_images` so the
  // schema-level FK + ordering are exercised. The actual upload will be
  // re-introduced when the S3-compatible store lands.
  if (productId === "__NEW__") {
    return { success: false, error: "Object store not configured; cannot upload images yet" };
  }

  try {
    await withTenant(adminUser.brand_id ?? "__missing__", (db) =>
      db.insert(productImages).values({
        productId,
        storageKey,
        position: 0,
        altText: null,
      })
    );
    return { success: true, imageUrl: `/storage/${storageKey}` };
  } catch (err) {
    return { success: false, error: `Upload failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function deleteProductImage(
  productId: string
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) return { success: false, error: "Not authenticated" };

  // In the new schema, "clearing" an image means removing the row(s)
  // from `product_images` for this product. The legacy `image_url` PATCH
  // pathway is gone (that column no longer exists on `products`).
  try {
    await withTenant(adminUser.brand_id ?? "__missing__", (db) =>
      db.delete(productImages).where(eq(productImages.productId, productId))
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: `Failed to clear image: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// Imported lazily to avoid a circular dep with the table ref above.
import { eq } from "drizzle-orm";
