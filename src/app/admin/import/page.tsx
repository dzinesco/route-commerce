import { getAdminUser } from "@/lib/admin-permissions";
import ImportCenterClient from "./ImportCenterClient";
import { getBrands } from "@/actions/admin/users";

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
    <main className="min-h-screen bg-stone-100 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <nav className="flex items-center gap-2 text-xs text-stone-500 mb-6">
          <a href="/admin" className="hover:text-stone-800 transition-colors">Admin</a>
          <span>/</span>
          <span className="text-stone-600">Import</span>
        </nav>
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