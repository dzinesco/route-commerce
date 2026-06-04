"use server";

import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import { supabase } from "@/lib/supabase";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import TaxDashboard from "@/components/admin/TaxDashboard";
import { PageHeader } from "@/components/admin/design-system";

type Props = {
  params: Promise<{ brandId?: string }>;
};

export default async function TaxesPage({ params }: Props) {
  const { brandId: brandIdParam } = await params;
  const adminUser = await getAdminUser();
  if (!adminUser) return <AdminAccessDenied />;

  const activeBrandId = await getActiveBrandId(adminUser, brandIdParam);
  if (!activeBrandId && adminUser.role !== "platform_admin") {
    return <AdminAccessDenied message="You don't have access to that brand." />;
  }
  const effectiveBrandId = activeBrandId ?? "";
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
        <main className="min-h-screen px-6 py-12" style={{ backgroundColor: "var(--admin-bg)" }}>
          <div className="mx-auto max-w-6xl">
            <div className="rounded-2xl p-8 text-center border" style={{ 
              backgroundColor: "white", 
              borderColor: "var(--admin-border)" 
            }}>
              <h1 className="text-2xl font-bold" style={{ color: "var(--admin-text-primary)" }}>No Brands Found</h1>
              <p className="mt-2" style={{ color: "var(--admin-text-muted)" }}>Create a brand in the database first.</p>
              <a href="/admin" className="mt-4 inline-block rounded-xl px-6 py-3 text-sm font-medium border transition-colors"
                 style={{ 
                   backgroundColor: "var(--admin-bg-subtle)", 
                   borderColor: "var(--admin-border)", 
                   color: "var(--admin-text-primary)" 
                 }}>
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
    <main className="min-h-screen" style={{ backgroundColor: "var(--admin-bg)" }}>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <PageHeader
          title="Tax Dashboard"
          subtitle="Sales tax collected on orders shipped to nexus states."
        />

        <TaxDashboard
          brands={allBrands}
          initialBrandId={resolvedBrandId}
          isPlatformAdmin={isPlatformAdmin}
        />
      </div>
    </main>
  );
}