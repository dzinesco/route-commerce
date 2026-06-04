import { supabase } from "@/lib/supabase";
import { getAdminUser } from "@/lib/admin-permissions";
import { getActiveBrandId } from "@/lib/brand-scope";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import ProductsClient from "@/components/admin/ProductsClient";

// Icon for page header
const PackageIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7.5 4.27 9 5.15"/>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <path d="m3.3 7 8.7 5 8.7-5"/>
    <path d="M12 22V12"/>
  </svg>
);

export default async function AdminProductsPage() {
  const adminUser = await getAdminUser();

  if (!adminUser) return <AdminAccessDenied />;

  if (!adminUser.can_manage_products) {
    return (
      <main className="min-h-screen bg-[var(--admin-bg)] px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-2 text-sm text-stone-500">You do not have permission to manage products.</p>
        </div>
      </main>
    );
  }

  const activeBrandId = await getActiveBrandId(adminUser);
  const brandId = activeBrandId;

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
      is_taxable
    `)
    .is("deleted_at", null)
    .order("name");

  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  const { data: products, error } = await query;

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--admin-bg)] px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-red-600">Error loading products</h1>
          <pre className="mt-4 rounded-xl bg-white border border-[var(--admin-border)] p-4 text-sm text-stone-600">
            {error.message}
          </pre>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      <ProductsClient products={products ?? []} brandId={brandId ?? undefined} />
    </div>
  );
}