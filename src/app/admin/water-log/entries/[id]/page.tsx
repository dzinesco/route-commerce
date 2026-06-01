import { getAdminUser } from "@/lib/admin-permissions";
import { getWaterAdminSession } from "@/actions/water-log/field";
import { getWaterEntryById } from "@/actions/water-log/admin";
import WaterLogEntryEditForm from "@/components/admin/WaterLogEntryEditForm";
import Link from "next/link";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";

export const dynamic = "force-dynamic";

type EntryPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function WaterLogEntryPage({ params, searchParams }: EntryPageProps) {
  const { id } = await params;
  const { from } = await searchParams;

  const adminUser = await getAdminUser();
  const waterSession = await getWaterAdminSession();

  const isSiteAdmin =
    adminUser?.role === "platform_admin" ||
    (adminUser?.role === "brand_admin" &&
      adminUser?.brand_id === TUXEDO_BRAND_ID &&
      adminUser?.can_manage_water_log);
  const isWaterAdmin = waterSession !== null && waterSession.role === "water_admin";

  if (!isSiteAdmin && !isWaterAdmin) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold text-red-400">Access Denied</h1>
          <p className="mt-2 text-zinc-400">You do not have permission to edit water log entries.</p>
          <a href={from ?? "/admin/water-log"} className="mt-4 inline-block text-zinc-400 hover:text-zinc-100">
            ← Back
          </a>
        </div>
      </main>
    );
  }

  const entry = await getWaterEntryById(id);

  if (!entry) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold text-red-400">Entry not found</h1>
          <p className="mt-2 text-zinc-400">This entry may have been deleted.</p>
          <a href={from ?? "/admin/water-log"} className="mt-4 inline-block text-zinc-400 hover:text-zinc-100">
            ← Back
          </a>
        </div>
      </main>
    );
  }

  const backHref = from ?? "/admin/water-log";

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <Link
          href={backHref}
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← Back
        </Link>

        <div className="mt-6 rounded-2xl bg-zinc-900 p-8 shadow-black/20 ring-1 ring-zinc-700">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Water Log Entry</p>
              <h1 className="mt-2 text-3xl font-bold text-zinc-100">{entry.headgate_name}</h1>
              <p className="mt-1 text-zinc-400">
                Submitted by {entry.user_name}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                entry.submitted_via === "field"
                  ? "bg-blue-900/40 text-blue-700"
                  : "bg-zinc-950 text-zinc-400"
              }`}
            >
              {entry.submitted_via}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-zinc-500">Measurement</p>
              <p className="mt-1 text-2xl font-bold text-zinc-100">
                {entry.measurement} {entry.unit}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">When</p>
              <p className="mt-1 text-lg font-semibold text-zinc-100">
                {new Date(entry.logged_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Notes</p>
              <p className="mt-1 text-zinc-100">{entry.notes ?? "—"}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-zinc-900 p-8 shadow-black/20 ring-1 ring-zinc-700">
          <h2 className="text-2xl font-bold text-zinc-100">Edit Entry</h2>
          <p className="mt-1 text-zinc-400">
            Update measurement or notes. User, headgate, and timestamp cannot be changed.
          </p>

          <div className="mt-6">
            <WaterLogEntryEditForm entry={entry} brandId={TUXEDO_BRAND_ID} backHref={backHref} />
          </div>
        </div>
      </div>
    </main>
  );
}