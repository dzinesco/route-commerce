import { supabase } from "@/lib/supabase";
import { getAdminUser } from "@/lib/admin-permissions";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import ProductsClient from "@/components/admin/ProductsClient";

// Icon components
const Icons = {
  package: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15"/>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/>
      <path d="M12 22V12"/>
    </svg>
  ),
};

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

  const brandId = adminUser.brand_id ?? "64294306-5f42-463d-a5e8-2ad6c81a96de";

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

  if (adminUser.brand_id) {
    query = query.eq("brand_id", adminUser.brand_id);
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
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-emerald-600">
            {Icons.package("h-5 w-5 sm:h-6 sm:w-6 text-white")}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--admin-text-primary)] tracking-tight">Products</h1>
            <p className="text-xs text-[var(--admin-text-muted)]">Manage your product catalog</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
        <div className="rounded-2xl border border-[var(--admin-border)] bg-white overflow-hidden">
          <ProductsClient products={products ?? []} brandId={brandId} />
        </div>
      </div>
    </div>
  );
}