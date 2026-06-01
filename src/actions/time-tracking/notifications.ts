"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { svcHeaders } from "@/lib/svc-headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type OvertimeCheckResult = {
  sent: boolean;
  trigger_type?: string;
  message?: string;
  notification_log_id?: string;
};

export async function checkAndNotifyOvertime(
  brandId: string,
  workerId: string,
  workerName: string,
  dailyHours: number,
  weeklyHours: number
): Promise<OvertimeCheckResult> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/check_and_notify_overtime`,
    {
      method: "POST",
      headers: { ...svcHeaders(supabaseKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_brand_id: brandId,
        p_worker_id: workerId,
        p_worker_name: workerName,
        p_daily_hours: dailyHours,
        p_weekly_hours: weeklyHours,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    return { sent: false, message: err };
  }
  const data = await res.json();
  return {
    sent: Boolean(data?.sent),
    trigger_type: data?.trigger_type,
    message: data?.message,
    notification_log_id: data?.notification_log_id,
  };
}