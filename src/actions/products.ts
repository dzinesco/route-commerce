"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

export async function deleteProduct(
  productId: string,
  brandId: string | null
): Promise<{ success: boolean; error?: string }> {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { success: false, error: "Not authenticated" };
  }

  if (!adminUser.can_manage_products) {
    return { success: false, error: "Not authorized to manage products" };
  }

  const effectiveBrandId = brandId ?? adminUser.brand_id ?? null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/delete_product`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_product_id: productId,
        p_brand_id: effectiveBrandId,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: "Request failed" }));
    return { success: false, error: err.message ?? "Delete failed" };
  }

  const result = await response.json();
  if (!result.success) {
    return { success: false, error: result.error ?? "Delete failed" };
  }

  logAuditEvent({
    table_name: "products",
    record_id: productId,
    action: "DELETE",
    old_data: { deleted_at: null },
    new_data: { deleted_at: new Date().toISOString() },
    brand_id: effectiveBrandId,
  });

  return { success: true };
}

async function logAuditEvent(event: {
  table_name: string;
  record_id: string;
  action: string;
  old_data: Record<string, unknown>;
  new_data: Record<string, unknown>;
  brand_id: string | null;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  await fetch(
    `${supabaseUrl}/rest/v1/rpc.log_audit_event`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify(event),
    }
  );
}