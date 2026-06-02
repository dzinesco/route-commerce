import { getAdminUser } from "@/lib/admin-permissions";
import ImportCenterClient from "./ImportCenterClient";
import { getBrands } from "@/actions/admin/users";
import { PageHeader } from "@/components/admin/design-system";

export default async function ImportCenterPage() {
  const adminUser = await getAdminUser();

  const brandId = adminUser?.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";
  const brandName = "Brand";

  let brands: { id: string; name: string }[] = [];
  let isPlatformAdmin = false;

  if (adminUser?.role === "platform_admin") {
    isPlatformAdmin = true;
    const result = await getBrands();
    if (!result.error && result.brands) {
      brands = result.brands;
    }
  }

  return (
    <main className="min-h-screen bg-[var(--admin-bg)] px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          breadcrumb={[
            { label: "Admin", href: "/admin" },
            { label: "Import" },
          ]}
          title="Import Center"
          subtitle="AI-powered data import for products, orders, contacts, and stops"
          icon={
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
        />
        <ImportCenterClient
          brandId={brandId}
          brandName={brandName}
          brands={brands}
          isPlatformAdmin={isPlatformAdmin}
        />
      </div>
    </main>
  );
}