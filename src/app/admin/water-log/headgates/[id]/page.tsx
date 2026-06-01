import { getAdminUser } from "@/lib/admin-permissions";
import { redirect } from "next/navigation";
import { getWaterAdminSession } from "@/actions/water-log/field";
import { getWaterHeadgatesAdmin } from "@/actions/water-log/admin";
import HeadgateEditForm from "@/components/admin/HeadgateEditForm";
import Link from "next/link";

const TUXEDO_BRAND_ID = "64294306-5f42-463d-a5e8-2ad6c81a96de";

export const dynamic = "force-dynamic";

type HeadgatePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function WaterLogHeadgatePage({ params, searchParams }: HeadgatePageProps) {
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

  const headgates = await getWaterHeadgatesAdmin(TUXEDO_BRAND_ID);
  const headgate = headgates.find((h) => h.id === id);

  if (!headgate) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold text-red-400">Headgate not found</h1>
          <p className="mt-2 text-zinc-400">This headgate may have been deleted.</p>
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
              <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Water Headgate</p>
              <h1 className="mt-2 text-3xl font-bold text-zinc-100">{headgate.name}</h1>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                headgate.active ? "bg-green-900/40 text-green-400" : "bg-zinc-950 text-zinc-500"
              }`}
            >
              {headgate.active ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-zinc-500">Default Unit</p>
              <p className="mt-1 text-2xl font-bold text-zinc-100">{headgate.unit}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Created</p>
              <p className="mt-1 text-lg font-semibold text-zinc-100">
                {new Date(headgate.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-zinc-900 p-8 shadow-black/20 ring-1 ring-zinc-700">
          <h2 className="text-2xl font-bold text-zinc-100">Edit Headgate</h2>
          <p className="mt-1 text-zinc-400">
            Update the headgate name, status, and default measurement unit.
          </p>

          <div className="mt-6">
            <HeadgateEditForm headgate={headgate} backHref={backHref} />
          </div>
        </div>
      </div>
    </main>
  );
}