"use server";

import { getAdminUser } from "@/lib/admin-permissions";

// TODO(migration): the `check_and_notify_overtime` SECURITY DEFINER
// RPC and the time-tracking notification tables are not part of the
// SaaS rebuild schema. The function below is a stub that returns
// `{ sent: false }` so the cron-style caller (`/api/time-tracking/notify`)
// degrades gracefully. See `actions/route-trace/lots.ts` for the
// same pattern.

export type OvertimeCheckResult = {
  sent: boolean;
  trigger_type?: string;
  message?: string;
  notification_log_id?: string;
};

export async function checkAndNotifyOvertime(
  _brandId: string,
  _workerId: string,
  _workerName: string,
  _dailyHours: number,
  _weeklyHours: number
): Promise<OvertimeCheckResult> {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    return { sent: false, message: "Not authenticated" };
  }
  return {
    sent: false,
    message: "Time tracking is not configured in the SaaS rebuild",
  };
}
