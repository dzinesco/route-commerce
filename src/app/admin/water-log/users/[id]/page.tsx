import { getAdminUser } from "@/lib/admin-permissions";
import { redirect } from "next/navigation";
import { getWaterAdminSession } from "@/actions/water-log/field";
import { getWaterIrrigators } from "@/actions/water-log/admin";
import WaterUserEditForm from "@/components/admin/WaterUserEditForm";
import Link from "next/link";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";

export const dynamic = "force-dynamic";

type UserPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function WaterLogUserPage({ params, searchParams }: UserPageProps) {
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

  if (!isSiteAdmin && !isWaterAdmin) redirect("/admin/pickup");

  const users = await getWaterIrrigators(TUXEDO_BRAND_ID);
  const waterUser = users.find((u) => u.id === id);

  if (!waterUser) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold text-red-400">User not found</h1>
          <p className="mt-2 text-zinc-400">This user may have been deleted.</p>
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
              <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Water User</p>
              <h1 className="mt-2 text-3xl font-bold text-zinc-100">{waterUser.name}</h1>
              <p className="mt-1 text-zinc-400">
                {waterUser.role === "water_admin" ? "Admin" : "Irrigator"}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                waterUser.active ? "bg-green-900/40 text-green-400" : "bg-zinc-950 text-zinc-500"
              }`}
            >
              {waterUser.active ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-zinc-500">Role</p>
              <p className="mt-1 text-lg font-semibold text-zinc-100">
                {waterUser.role === "water_admin" ? "Admin" : "Irrigator"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Language</p>
              <p className="mt-1 text-lg font-semibold text-zinc-100">
                {waterUser.language_preference === "es" ? "Español" : "English"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Last Used</p>
              <p className="mt-1 text-lg font-semibold text-zinc-100">
                {waterUser.last_used_at
                  ? new Date(waterUser.last_used_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Never"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-zinc-900 p-8 shadow-black/20 ring-1 ring-zinc-700">
          <h2 className="text-2xl font-bold text-zinc-100">Edit User</h2>
          <p className="mt-1 text-zinc-400">
            Update name, role, language, and active status. Use Reset PIN to generate a new PIN.
          </p>

          <div className="mt-6">
            <WaterUserEditForm waterUser={waterUser} backHref={backHref} />
          </div>
        </div>
      </div>
    </main>
  );
}