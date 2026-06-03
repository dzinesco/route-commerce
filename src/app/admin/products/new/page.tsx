import { getAdminUser } from "@/lib/admin-permissions";
import NewProductForm from "@/components/admin/NewProductForm";
import { getBrands } from "@/actions/admin/users";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function NewProductPage() {
  const adminUser = await getAdminUser();
  if (!adminUser?.can_manage_products) redirect("/admin/pickup");

  // Resolve brand from the signed-in admin. For brand_admin / store_employee
  // this is their assigned brand. For platform_admin (brand_id === null) we
  // fetch the full brand list so they can choose.
  const isPlatformAdmin = !adminUser.brand_id;
  let brands: { id: string; name: string }[] = [];
  if (isPlatformAdmin) {
    const result = await getBrands();
    brands = result.brands ?? [];
  }

  return (
    <main className="min-h-screen px-6 py-12" style={{ backgroundColor: "var(--admin-bg)" }}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href="/admin/products"
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            ← Back to Products
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl shadow-stone-200/50">
          <h1 className="text-3xl font-bold text-stone-950">
            Create Product
          </h1>

          <p className="mt-2 text-stone-500">
            {isPlatformAdmin
              ? "Add a new product to any brand you administer."
              : "Add a new product to your brand's catalog."}
          </p>

          <NewProductForm
            defaultBrandId={adminUser.brand_id ?? ""}
            brands={brands}
            lockBrand={!isPlatformAdmin}
          />
        </div>
      </div>
    </main>
  );
}