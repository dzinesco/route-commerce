import { supabase } from "@/lib/supabase";
import ProductTableClient from "@/components/admin/ProductTableClient";
import { getAdminUser } from "@/lib/admin-permissions";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPaymentSettings } from "@/actions/payments";
import ProductSyncBanner from "@/components/admin/ProductSyncBanner";

export default async function AdminProductsPage() {
  const adminUser = await getAdminUser();

  if (!adminUser) return <AdminAccessDenied />;

  if (!adminUser.can_manage_products) {
    redirect("/admin/pickup");
  }

  const brandId =
    adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

  const [settingsResult] = await Promise.all([
    getPaymentSettings(brandId),
  ]);
  const hasSquareToken = !!(
    settingsResult.success && settingsResult.settings?.square_access_token
  );

  let query = supabase
    .from("products")
    .select(`
      id,
      name,
      description,
      price,
      type,
      active,
      deleted_at,
      image_url,
      brand_id,
      is_taxable,
      brands (
        name
      )
    `)
    .is("deleted_at", null)
    .order("name");

  if (adminUser?.brand_id) {
    query = query.eq("brand_id", adminUser.brand_id);
  }

  const { data: products, error } = await query;

  if (error) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <nav className="mb-6 flex items-center gap-2 text-xs text-stone-500">
            <Link href="/admin" className="hover:text-stone-600 transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-stone-600">Products</span>
          </nav>
          <h1 className="text-3xl font-bold text-red-600">Error loading products</h1>
          <pre className="mt-4 rounded-xl bg-white border border-stone-200 p-4 text-sm text-stone-600">
            {error.message}
          </pre>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-stone-500">
          <Link href="/admin" className="hover:text-stone-600 transition-colors">Admin</Link>
          <span>/</span>
          <span className="text-stone-600">Products</span>
        </nav>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-stone-950 tracking-tight">Products</h1>
            <p className="mt-2 text-sm text-stone-500">
              Manage your product catalog.
            </p>
          </div>

          <Link
            href="/admin/products/new"
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 px-5 py-3 font-semibold text-white text-sm transition-colors shadow-sm"
          >
            Add Product
          </Link>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl bg-white border border-stone-200 shadow-sm">
          <ProductSyncBanner brandId={brandId} hasSquareToken={hasSquareToken} />
          <ProductTableClient products={products ?? []} />
        </div>
      </div>
    </main>
  );
}