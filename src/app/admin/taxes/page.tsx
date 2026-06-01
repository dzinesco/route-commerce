"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { supabase } from "@/lib/supabase";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import TaxDashboard from "@/components/admin/TaxDashboard";

type Props = {
  params: Promise<{ brandId?: string }>;
};

export default async function TaxesPage({ params }: Props) {
  const { brandId: brandIdParam } = await params;
  const adminUser = await getAdminUser();
  if (!adminUser) return <AdminAccessDenied />;

  const effectiveBrandId = brandIdParam ?? adminUser.brand_id ?? "";
  const isPlatformAdmin = adminUser.role === "platform_admin";

  let resolvedBrandId = effectiveBrandId;
  if (isPlatformAdmin && !resolvedBrandId) {
    const { data: firstBrand } = await supabase
      .from("brands")
      .select("id")
      .limit(1)
      .single();
    if (firstBrand?.id) {
      resolvedBrandId = firstBrand.id;
    } else {
      return (
        <main className="min-h-screen bg-stone-100 px-6 py-12">
          <div className="mx-auto max-w-6xl">
            <div className="card p-8 text-center">
              <h1 className="text-2xl font-bold text-stone-950">No Brands Found</h1>
              <p className="mt-2 text-stone-500">Create a brand in the database first.</p>
              <a href="/admin" className="mt-4 inline-block rounded-xl bg-stone-200 px-6 py-3 text-sm font-medium text-stone-700 border border-stone-300 hover:bg-stone-300 transition-colors">
                Back to Admin
              </a>
            </div>
          </div>
        </main>
      );
    }
  }

  if (!resolvedBrandId) return <AdminAccessDenied />;

  const { data: brands } = await supabase
    .from("brands")
    .select("id, name")
    .order("name");

  const allBrands = (brands ?? []) as Array<{ id: string; name: string }>;

  return (
    <main className="min-h-screen bg-stone-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-950">Tax Dashboard</h1>
          <p className="mt-1 text-stone-500">
            Sales tax collected on orders shipped to nexus states.
          </p>
        </div>

        <TaxDashboard
          brands={allBrands}
          initialBrandId={resolvedBrandId}
          isPlatformAdmin={isPlatformAdmin}
        />
      </div>
    </main>
  );
}