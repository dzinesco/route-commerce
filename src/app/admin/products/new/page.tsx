import { getAdminUser } from "@/lib/admin-permissions";
import NewProductForm from "@/components/admin/NewProductForm";
import { redirect } from "next/navigation";

export default async function NewProductPage() {
  const adminUser = await getAdminUser();
  if (!adminUser?.can_manage_products) redirect("/admin/pickup");
  return (
    <main className="min-h-screen px-6 py-12" style={{ backgroundColor: "var(--admin-bg)" }}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <a
            href="/admin/products"
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            ← Back to Products
          </a>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl shadow-stone-200/50">
          <h1 className="text-3xl font-bold text-stone-950">
            Create Product
          </h1>

          <p className="mt-2 text-stone-500">
            Add a new product for Tuxedo Corn or Indian River Direct.
          </p>

          <NewProductForm />
        </div>
      </div>
    </main>
  );
}