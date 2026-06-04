"use client";

import { useState, useCallback, useRef, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createProduct } from "@/actions/products/create-product";
import { updateProduct } from "@/actions/products/update-product";
import { deleteProduct } from "@/actions/products";
import { uploadProductImage } from "@/actions/products/upload-image";
import GlassModal from "@/components/admin/GlassModal";
import { PageHeader, AdminButton, AdminIconButton, AdminSearchInput, AdminFilterTabs, AdminViewModeTabs, useToast, Skeleton } from "@/components/admin/design-system";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  type: string;
  active: boolean;
  image_url?: string | null;
  brand_id: string;
  is_taxable: boolean;
};

type FormData = {
  name: string;
  description: string;
  price: string;
  type: string;
  active: boolean;
  image_url: string;
  is_taxable: boolean;
};

type ViewMode = "table" | "cards";

// Icons
const Icons = {
  search: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  plus: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  package: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15"/>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/>
      <path d="M12 22V12"/>
    </svg>
  ),
  upload: (className: string) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
};

// Page header icon
const PackageIconHeader = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7.5 4.27 9 5.15"/>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <path d="m3.3 7 8.7 5 8.7-5"/>
    <path d="M12 22V12"/>
  </svg>
);

export default function ProductsClient({ products, brandId }: { products: Product[]; brandId?: string }) {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    price: "",
    type: "pickup",
    active: true,
    image_url: "",
    is_taxable: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Image upload states
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && p.active) ||
      (statusFilter === "inactive" && !p.active);
    return matchesSearch && matchesStatus;
  });

  const activeCount = products.filter((p) => p.active).length;
  const inactiveCount = products.filter((p) => !p.active).length;

  async function resizeImage(file: File, maxWidth: number): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Failed to resize image"));
            return;
          }
          blob.arrayBuffer().then((buf) => resolve(buf));
        }, "image/jpeg", 0.85);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async function handleFileSelect(file: File) {
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Only PNG, JPEG, and WebP images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5MB.");
      return;
    }

    setUploadError(null);
    setUploading(true);

    const resizedBuffer = await resizeImage(file, 1200);
    const resizedFile = new File([resizedBuffer], file.name, { type: "image/jpeg" });

    const productIdForUpload = editingProduct ? editingProduct.id : "__NEW__";
    const result = await uploadProductImage(productIdForUpload, resizedFile);

    setUploading(false);

    if (result.success) {
      setPendingImageUrl(result.imageUrl);
      setImagePreview(result.imageUrl);
      setFormData({ ...formData, image_url: result.imageUrl });
    } else {
      setUploadError(result.error ?? "Upload failed.");
    }
  }

  const openAddModal = useCallback(() => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      type: "pickup",
      active: true,
      image_url: "",
      is_taxable: true,
    });
    setImagePreview(null);
    setPendingImageUrl(null);
    setUploadError(null);
    setError(null);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      type: product.type,
      active: product.active,
      image_url: product.image_url || "",
      is_taxable: product.is_taxable,
    });
    setImagePreview(product.image_url || null);
    setPendingImageUrl(null);
    setUploadError(null);
    setError(null);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingProduct(null);
    setImagePreview(null);
    setPendingImageUrl(null);
    setUploadError(null);
    setError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    setIsLoading(true);

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      setError("Please enter a valid price");
      setSaving(false);
      setIsLoading(false);
      return;
    }

    if (!formData.name.trim()) {
      setError("Product name is required");
      setSaving(false);
      setIsLoading(false);
      return;
    }

    try {
      // For edits, fall back to the product's own brand_id (platform_admins
      // don't have a brand_id, but the product record always knows its brand).
      const effectiveBrandId = brandId ?? editingProduct?.brand_id;
      if (!effectiveBrandId) {
        setError("Brand ID is required");
        setSaving(false);
        setIsLoading(false);
        return;
      }

      let result;
      const imageUrl = pendingImageUrl || formData.image_url || null;

      if (editingProduct) {
        result = await updateProduct(editingProduct.id, effectiveBrandId, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          price,
          type: formData.type,
          active: formData.active,
          image_url: imageUrl,
          is_taxable: formData.is_taxable,
        });
      } else {
        result = await createProduct(effectiveBrandId, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          price,
          type: formData.type,
          active: formData.active,
          image_url: imageUrl,
          is_taxable: formData.is_taxable,
        });
      }

      if (!result.success) {
        setError(result.error ?? "Failed to save product");
        showError("Failed to save product", result.error ?? "Please try again");
        setSaving(false);
        setIsLoading(false);
        return;
      }

      showSuccess(editingProduct ? "Product updated" : "Product created", `${formData.name} has been saved`);
      closeModal();
      setIsLoading(false);
      startTransition(() => router.refresh());
    } catch {
      setError("Network error. Please try again.");
      showError("Network error", "Please check your connection and try again");
      setSaving(false);
      setIsLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    setDeletingId(productId);
    const result = await deleteProduct(productId, null);
    setDeletingId(null);
    if (result.success) {
      setDeleteConfirm(null);
      showSuccess("Product deleted", "The product has been removed");
      startTransition(() => router.refresh());
    } else {
      showError("Failed to delete product", result.error ?? "Please try again");
    }
  };

  // Filter tabs configuration
  const filterTabs = [
    { value: "all", label: "All", count: products.length },
    { value: "active", label: "Active", count: activeCount },
    { value: "inactive", label: "Inactive", count: inactiveCount },
  ];

  return (
    <div className="p-4 sm:p-6">
      {/* Page Header */}
      <PageHeader
        icon={<PackageIconHeader />}
        title="Products"
        subtitle={`${filtered.length} product${filtered.length !== 1 ? "s" : ""}`}
        actions={
          <AdminButton
            onClick={openAddModal}
            icon={Icons.plus("h-4 w-4")}
          >
            Add Product
          </AdminButton>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-[var(--admin-border)] p-4">
          <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)] font-medium">Total</p>
          <p className="text-xl sm:text-2xl font-bold text-[var(--admin-text-primary)] mt-1">{isLoading ? <Skeleton variant="text" className="w-12 h-6" /> : products.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--admin-border)] p-4">
          <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)] font-medium">Active</p>
          <p className="text-xl sm:text-2xl font-bold text-[var(--admin-accent)] mt-1">{isLoading ? <Skeleton variant="text" className="w-10 h-6" /> : activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--admin-border)] p-4">
          <p className="text-[10px] sm:text-xs text-[var(--admin-text-muted)] font-medium">Inactive</p>
          <p className="text-xl sm:text-2xl font-bold text-stone-400 mt-1">{isLoading ? <Skeleton variant="text" className="w-8 h-6" /> : inactiveCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Status Tabs */}
        <AdminFilterTabs
          activeTab={statusFilter}
          onTabChange={(value) => setStatusFilter(value as "all" | "active" | "inactive")}
          tabs={filterTabs}
          size="md"
        />

        {/* Search */}
        <AdminSearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder="Search products..."
          containerClassName="flex-1"
        />

        {/* View Toggle */}
        <AdminViewModeTabs
          activeTab={viewMode}
          onTabChange={(value) => setViewMode(value as ViewMode)}
        />
      </div>

      {/* Content */}
      {viewMode === "table" ? (
        <TableView
          products={filtered}
          onEdit={openEditModal}
          onDelete={(id) => setDeleteConfirm(id)}
          deleteConfirm={deleteConfirm}
          onDeleteConfirm={(id) => handleDelete(id)}
          onDeleteCancel={() => setDeleteConfirm(null)}
          deletingId={deletingId}
        />
      ) : (
        <CardView
          products={filtered}
          onEdit={openEditModal}
          onDelete={(id) => setDeleteConfirm(id)}
          deleteConfirm={deleteConfirm}
          onDeleteConfirm={(id) => handleDelete(id)}
          onDeleteCancel={() => setDeleteConfirm(null)}
          deletingId={deletingId}
        />
      )}

      {/* Modal */}
      {showModal && (
        <GlassModal
          title={editingProduct ? "Edit Product" : "Add Product"}
          subtitle={editingProduct ? `Editing ${editingProduct.name}` : "Create a new product"}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-start gap-3">
                <svg className="h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Product name"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/20 placeholder:text-[var(--admin-text-muted)] transition-colors ${
                  error && !formData.name.trim()
                    ? "border-red-400 bg-red-50"
                    : "border-[var(--admin-border)] bg-white focus:border-[var(--admin-accent)]"
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description"
                rows={2}
                className="w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20 placeholder:text-[var(--admin-text-muted)] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    className={`w-full rounded-xl border pl-8 pr-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/20 ${
                      error && (!formData.price || parseFloat(formData.price) < 0)
                        ? "border-red-400 bg-red-50"
                        : "border-[var(--admin-border)] bg-white focus:border-[var(--admin-accent)]"
                    }`}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                >
                  <option value="pickup">Pickup</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="subscription">Subscription</option>
                </select>
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Product Image</label>
              <p className="text-[10px] text-stone-500 mb-2">JPG, PNG, WebP · 1200px max width · max 5MB</p>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileSelect(file);
                }}
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`
                  flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors
                  ${uploadError ? "border-red-400" : "border-[var(--admin-border)] hover:border-[var(--admin-accent)] hover:bg-[var(--admin-accent)]/5"}
                  ${uploading ? "opacity-50 pointer-events-none" : ""}
                `}
              >
                {uploading ? (
                  <>
                    <div className="h-5 w-5 rounded-full border-2 border-[var(--admin-accent)] border-t-transparent animate-spin" />
                    <span className="text-sm text-stone-500">Uploading...</span>
                  </>
                ) : imagePreview ? (
                  <div className="relative">
                    <div className="relative h-32 sm:h-40 w-auto">
                      <Image src={imagePreview} alt="Product preview" fill style={{ objectFit: "contain" }} className="rounded-lg" />
                    </div>
                    <span className="block text-center text-xs text-stone-500 mt-2">Click or drop to replace</span>
                  </div>
                ) : (
                  <>
                    {Icons.upload("h-8 w-8 text-stone-400")}
                    <span className="text-sm text-stone-500">Drag & drop or click to upload</span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                    e.target.value = "";
                  }}
                />
              </div>

              {uploadError && (
                <p className="mt-1 text-xs text-red-500">{uploadError}</p>
              )}

              {(imagePreview || formData.image_url) && (
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setPendingImageUrl(null);
                    setFormData({ ...formData, image_url: "" });
                  }}
                  className="mt-2 text-xs text-red-500 hover:underline"
                >
                  Remove image
                </button>
              )}
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="h-4 w-4 rounded border-[var(--admin-border)] text-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/30 focus:ring-offset-1 cursor-pointer"
                />
                <span className="text-sm font-medium text-stone-700">Active</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_taxable}
                  onChange={(e) => setFormData({ ...formData, is_taxable: e.target.checked })}
                  className="h-4 w-4 rounded border-[var(--admin-border)] text-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/30 focus:ring-offset-1 cursor-pointer"
                />
                <span className="text-sm font-medium text-stone-700">Taxable</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
              <AdminButton
                type="button"
                variant="secondary"
                onClick={closeModal}
              >
                Cancel
              </AdminButton>
              <AdminButton
                type="submit"
                variant="primary"
                isLoading={saving}
                disabled={!formData.name.trim() || !formData.price}
              >
                {editingProduct ? "Save Changes" : "Create Product"}
              </AdminButton>
            </div>
          </form>
        </GlassModal>
      )}
    </div>
  );
}

// ── Table View ─────────────────────────────────────────────────────────────────

function TableView({
  products,
  onEdit,
  onDelete,
  deleteConfirm,
  onDeleteConfirm,
  onDeleteCancel,
  deletingId,
}: {
  products: Product[];
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  deleteConfirm: string | null;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
  deletingId: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--admin-border)] bg-white">
      <table className="w-full text-sm">
        <thead className="bg-stone-50">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Product</th>
            <th className="text-left px-4 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Type</th>
            <th className="text-left px-4 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Price</th>
            <th className="text-left px-4 py-3 font-semibold text-[var(--admin-text-muted)] text-xs">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--admin-border)]">
          {products.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-16 text-center">
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-stone-100 mb-4">
                  {Icons.package("h-8 w-8 text-stone-400")}
                </div>
                <p className="text-sm font-medium text-stone-600">No products found</p>
                <p className="text-xs text-stone-400 mt-1">Try adjusting your filters</p>
              </td>
            </tr>
          ) : (
            products.map((product) => (
              <tr key={product.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {product.image_url ? (
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[var(--admin-border)]">
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          style={{ objectFit: "cover" }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-stone-100 flex items-center justify-center shrink-0 border border-[var(--admin-border)]">
                        <span className="text-stone-400">□</span>
                      </div>
                    )}
                    <div>
                      <button
                        onClick={() => onEdit(product)}
                        className="font-semibold text-[var(--admin-text-primary)] hover:text-[var(--admin-accent)] transition-colors text-left"
                      >
                        {product.name}
                      </button>
                      <div className="text-xs text-stone-500 line-clamp-1">
                        {product.description || <span className="italic text-stone-400">No description</span>}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-stone-600">
                    {product.type}
                  </span>
                </td>

                <td className="px-4 py-3 font-mono text-sm font-semibold text-[var(--admin-text-primary)]">
                  ${Number(product.price).toFixed(2)}
                </td>

                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    product.active ? "bg-[var(--admin-accent)]/10 text-[var(--admin-accent)]" : "bg-stone-100 text-stone-500"
                  }`}>
                    {product.active ? "Active" : "Inactive"}
                  </span>
                </td>

                <td className="px-4 py-3 text-right">
                  <div className="relative inline-flex items-center justify-end gap-1">
                    <AdminButton
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(product)}
                    >
                      Edit
                    </AdminButton>
                    <button
                      onClick={() => onDelete(product.id)}
                      className="rounded-lg px-2 py-1.5 text-xs text-[var(--admin-text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>

                    {deleteConfirm === product.id && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={onDeleteCancel} />
                        <div className="absolute right-0 top-full mt-1 z-40 w-72 rounded-xl bg-white border border-[var(--admin-border)] shadow-xl p-4">
                          <p className="text-sm font-semibold text-stone-900">
                            Delete &quot;{product.name}&quot;?
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            This will remove the product. If attached to orders, it will be hidden.
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={onDeleteCancel}
                              className="flex-1 rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                            >
                              Cancel
                            </button>
                            <AdminButton
                              onClick={() => onDeleteConfirm(product.id)}
                              disabled={deletingId === product.id}
                              variant="danger"
                              size="sm"
                              className="flex-1"
                            >
                              {deletingId === product.id ? "..." : "Delete"}
                            </AdminButton>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Card View ──────────────────────────────────────────────────────────────────

function CardView({
  products,
  onEdit,
  onDelete,
  deleteConfirm,
  onDeleteConfirm,
  onDeleteCancel,
  deletingId,
}: {
  products: Product[];
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  deleteConfirm: string | null;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
  deletingId: string | null;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.length === 0 ? (
        <div className="col-span-full text-center py-16 rounded-xl border border-[var(--admin-border)] bg-white">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-stone-100 mb-4">
            {Icons.package("h-8 w-8 text-stone-400")}
          </div>
          <p className="text-sm font-medium text-stone-600">No products found</p>
          <p className="text-xs text-stone-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        products.map((product) => (
          <div
            key={product.id}
            className="group relative rounded-xl border border-[var(--admin-border)] bg-white hover:shadow-md hover:border-[var(--admin-accent)]/30 transition-all overflow-hidden"
          >
            {/* Image */}
            <div className="relative h-40 bg-stone-100">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  style={{ objectFit: "cover" }}
                  className="transition-transform group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl text-stone-300">□</span>
                </div>
              )}
              {/* Status badge */}
              <div className="absolute top-3 right-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold shadow-sm ${
                  product.active ? "bg-[var(--admin-accent)] text-white" : "bg-stone-500 text-white"
                }`}>
                  {product.active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <button
                onClick={() => onEdit(product)}
                className="block w-full text-left"
              >
                <h3 className="font-semibold text-[var(--admin-text-primary)] group-hover:text-[var(--admin-accent)] transition-colors line-clamp-1">
                  {product.name}
                </h3>
                <p className="text-xs text-stone-500 mt-1 line-clamp-2 h-8">
                  {product.description || <span className="italic">No description</span>}
                </p>
              </button>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100">
                <div>
                  <span className="text-xs text-stone-500">Price</span>
                  <p className="text-lg font-bold text-[var(--admin-text-primary)] font-mono">
                    ${Number(product.price).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-stone-600">
                    {product.type}
                  </span>
                  {product.is_taxable && (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                      Tax
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <AdminButton
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit(product)}
                  className="flex-1"
                >
                  Edit
                </AdminButton>
                <button
                  onClick={() => onDelete(product.id)}
                  className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-xs font-semibold text-[var(--admin-text-muted)] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Delete confirm */}
            {deleteConfirm === product.id && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-xl p-4 max-w-[280px] mx-4">
                  <p className="text-sm font-semibold text-stone-900">
                    Delete &quot;{product.name}&quot;?
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    This will remove the product. If attached to orders, it will be hidden.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={onDeleteCancel}
                      className="flex-1 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => onDeleteConfirm(product.id)}
                      disabled={deletingId === product.id}
                      className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50 hover:bg-red-500"
                    >
                      {deletingId === product.id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}