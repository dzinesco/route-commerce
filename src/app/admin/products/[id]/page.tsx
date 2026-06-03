import { supabase } from "@/lib/supabase";
import ProductEditForm from "@/components/admin/ProductEditForm";
import { getAdminUser } from "@/lib/admin-permissions";
import AdminAccessDenied from "@/components/admin/AdminAccessDenied";
import { redirect } from "next/navigation";
import Link from "next/link";

type ProductDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;

  const [{ data: product, error }, { data: brands }] = await Promise.all([
    supabase.from("products").select("*, brands(name, slug)").eq("id", id).single(),
    supabase.from("brands").select("id, name, slug"),
  ]);

  const adminUser = await getAdminUser();

  if (!adminUser) return <AdminAccessDenied />;

  if (!adminUser.can_manage_products) redirect("/admin/pickup");

  if (adminUser?.brand_id && product?.brand_id !== adminUser.brand_id) {
    return <AdminAccessDenied />;
  }

  if (error || !product) {
    return (
      <main className="min-h-screen px-6 py-12" style={{ backgroundColor: "var(--admin-bg)" }}>
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold text-red-600">Product not found</h1>
          <pre className="mt-4 rounded-xl bg-white p-4 text-sm text-stone-600">
            {error?.message ?? "Product not found"}
          </pre>
          <Link
            href="/admin/products"
            className="mt-4 inline-block text-stone-500 hover:text-stone-700"
          >
            ← Back to Products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12" style={{ backgroundColor: "var(--admin-bg)" }}>
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin/products"
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          ← Back to Products
        </Link>

        <div className="mt-6 rounded-2xl bg-white p-8 shadow-xl shadow-stone-200/50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                {product.brands?.name}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-stone-950">
                {product.name}
              </h1>
              <p className="mt-2 text-lg text-stone-600">
                {product.description}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                product.active
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-stone-200 text-stone-500"
              }`}
            >
              {product.active ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-stone-500">Price</p>
              <p className="mt-1 text-2xl font-bold text-stone-950">
                ${Number(product.price).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">Type</p>
              <p className="mt-1 text-lg font-semibold text-stone-950">
                {product.type}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-8 shadow-xl shadow-stone-200/50">
          <h2 className="text-2xl font-bold text-stone-950">Edit Product</h2>
          <p className="mt-1 text-stone-500">
            Update product details, pricing, and availability.
          </p>

          <div className="mt-6">
            <ProductEditForm
              product={{
                id: product.id,
                name: product.name,
                description: product.description,
                price: Number(product.price),
                type: product.type,
                active: product.active,
                brand_id: product.brand_id,
                image_url: product.image_url,
                is_taxable: product.is_taxable,
                pickup_type: product.pickup_type,
              }}
              brands={brands ?? []}
            />
          </div>
        </div>
      </div>
    </main>
  );
}