"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { logAuditEvent } from "@/actions/audit";
import { svcHeaders } from "@/lib/svc-headers";

type MarkPickupResult =
  | { success: true; pickup_completed_at: string; pickup_completed_by: string | null }
  | { success: false; error: string };

export async function markPickupComplete(
  orderId: string,
  brandId: string | null
): Promise<MarkPickupResult> {
  const adminUser = await getAdminUser();

  if (!adminUser) {
    return { success: false, error: "Not authenticated" };
  }

  if (!adminUser.can_manage_pickup) {
    return { success: false, error: "Not authorized to manage pickup" };
  }

  const now = new Date().toISOString();
  // `user_id` is null for Google-authenticated admins who haven't been
  // linked to a Supabase auth user yet. Pass null through; downstream
  // audit/assignment RPCs will surface a clearer error.
  const performedBy = adminUser.user_id;

  // brand_admin: verify the order belongs to their brand
  if (adminUser.role === "brand_admin" && adminUser.brand_id) {
    const brandRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=stop_id,brand_id`,
      {
        headers: svcHeaders(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
      }
    );

    if (!brandRes.ok) {
      return { success: false, error: "Failed to verify order ownership" };
    }

    const orderData = await brandRes.json();
    if (!Array.isArray(orderData) || orderData.length === 0) {
      return { success: false, error: "Order not found" };
    }

    const order = orderData[0];

    // Check brand_id on the order first, then fall back to stop brand
    if (order.brand_id && order.brand_id !== adminUser.brand_id) {
      return { success: false, error: "Not authorized for this order" };
    }

    if (!order.brand_id && order.stop_id) {
      const stopRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/stops?id=eq.${order.stop_id}&select=brand_id`,
        {
          headers: svcHeaders(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
        }
      );

      if (stopRes.ok) {
        const stopData = await stopRes.json();
        if (Array.isArray(stopData) && stopData[0]?.brand_id !== adminUser.brand_id) {
          return { success: false, error: "Not authorized for this order" };
        }
      }
    }
  }

  // PATCH the order
  const patchRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`,
    {
      method: "PATCH",
      headers: {
        ...svcHeaders(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        pickup_complete: true,
        pickup_completed_at: now,
        pickup_completed_by: performedBy,
      }),
    }
  );

  if (!patchRes.ok) {
    const err = await patchRes.json().catch(() => ({ message: "Patch failed" }));
    return { success: false, error: err.message ?? "Failed to update pickup" };
  }

  // Fire-and-forget audit log
  logAuditEvent({
    table_name: "orders",
    record_id: orderId,
    action: "UPDATE",
    old_data: {
      pickup_complete: false,
      pickup_completed_at: null,
      pickup_completed_by: null,
    },
    new_data: {
      pickup_complete: true,
      pickup_completed_at: now,
      pickup_completed_by: performedBy,
    },
    brand_id: brandId,
  });

  // Emit pickup_completed event
  // Need brand_id — get it from the order we just patched
  const orderRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=brand_id`,
    {
      headers: svcHeaders(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    }
  );
  if (orderRes.ok) {
    const orderData = await orderRes.json();
    const orderBrandId = Array.isArray(orderData) && orderData[0]?.brand_id;
    if (orderBrandId) {
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/record_pickup_completed_event`,
        {
          method: "POST",
          headers: {
            ...svcHeaders(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_order_id: orderId,
            p_brand_id: orderBrandId,
            p_actor_id: performedBy,
          }),
        }
      );
    }
  }

  return {
    success: true,
    pickup_completed_at: now,
    pickup_completed_by: performedBy,
  };
}