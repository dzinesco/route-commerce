"use client";

import NextImage from "next/image";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadProductImage, deleteProductImage } from "@/actions/products/upload-image";
import { updateProduct } from "@/actions/products/update-product";
import { AdminInput, AdminTextInput, AdminTextarea, AdminSelect } from "./design-system";

type Brand = {
  id: string;
  name: string;
  slug: string;
};

type ProductEditFormProps = {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    type: string;
    active: boolean;
    brand_id: string;
    image_url?: string | null;
    is_taxable?: boolean;
    pickup_type?: string;
  };
  brands: Brand[];
};

export default function ProductEditForm({ product, brands }: ProductEditFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(product.price);
  const [type, setType] = useState(product.type);
  const [active, setActive] = useState(product.active);
  const [brand_id, setBrand_id] = useState(product.brand_id);
  const [image_url, setImage_url] = useState(product.image_url ?? "");
  const [is_taxable, setIs_taxable] = useState(product.is_taxable ?? true);
  const [pickup_type, setPickup_type] = useState(product.pickup_type ?? "scheduled_stop");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product.image_url ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Client-side resize to max 1200px width
    const resizedBuffer = await resizeImage(file, 1200);
    const resizedFile = new File([resizedBuffer], file.name, { type: "image/jpeg" });

    setUploadError(null);
    setUploading(true);
    const result = await uploadProductImage(product.id, resizedFile);
    setUploading(false);

    if (result.success) {
      setImage_url(result.imageUrl);
      setImagePreview(result.imageUrl);
    } else {
      setUploadError(result.error ?? "Upload failed.");
    }
  }

  async function handleRemoveImage() {
    const result = await deleteProductImage(product.id);
    if (result.success) {
      setImage_url("");
      setImagePreview(null);
    }
  }

  async function resizeImage(file: File, maxWidth: number): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const img = new Image();
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

  async function handleSave() {
    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updateProduct(product.id, brand_id, {
      name,
      description,
      price: Number(price),
      type,
      active,
      image_url: image_url || null,
      is_taxable,
      pickup_type,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to save");
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-900/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-xl bg-green-900/30 p-4 text-sm text-green-400">
          Product updated successfully.
        </div>
      )}

      <AdminInput label="Name">
        <AdminTextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Product name"
        />
      </AdminInput>

      <AdminInput label="Description">
        <AdminTextarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Product description"
        />
      </AdminInput>

      <div className="grid grid-cols-2 gap-4">
        <AdminInput label="Price">
            <AdminTextInput
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="0.00"
            />
          </AdminInput>

        <AdminInput label="Type">
            <AdminTextInput
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g. Sweet Corn"
            />
          </AdminInput>
      </div>

      <AdminInput label="Brand">
        <AdminSelect
          value={brand_id}
          onChange={(e) => setBrand_id(e.target.value)}
          options={brands.map((b) => ({ value: b.id, label: b.name }))}
        />
      </AdminInput>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">Status</label>
        <button
          onClick={() => setActive((v) => !v)}
          className={`w-full rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
            active
              ? "bg-green-900/40 text-green-400"
              : "bg-zinc-950 text-zinc-400 hover:bg-slate-200"
          }`}
        >
          {active ? "Active" : "Inactive"}
        </button>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">Taxable</label>
        <button
          onClick={() => setIs_taxable((v) => !v)}
          className={`w-full rounded-xl px-4 py-3 text-sm font-medium transition-colors flex items-center gap-3 ${
            is_taxable
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              : "bg-amber-900/30 text-amber-700 ring-1 ring-amber-200"
          }`}
        >
          <span className="text-lg">{is_taxable ? "✓" : "✗"}</span>
          <span>{is_taxable ? "Taxable — tax applied at checkout for nexus shipments" : "Non-taxable — always exempt from sales tax"}</span>
        </button>
        <p className="mt-1.5 text-xs text-zinc-500">Tax is calculated at checkout for shipping orders in your brand&apos;s nexus states. Non-taxable items (e.g. cooler boxes, apparel) are always exempt.</p>
      </div>

      <AdminInput 
          label="Pickup Type"
          helpText="Shed pickup uses the product description as the pickup location — no stop required at checkout."
        >
          <AdminSelect
            value={pickup_type}
            onChange={(e) => setPickup_type(e.target.value)}
            options={[
              { value: "scheduled_stop", label: "Scheduled Stop — requires stop selection at checkout" },
              { value: "shed", label: "Shed Pickup — uses description as location" },
            ]}
          />
        </AdminInput>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-300">Product Image</label>
        <p className="text-xs text-zinc-500 mb-2">JPG, PNG, WebP · 1200px max width · max 5MB (ideally under 2MB)</p>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFileSelect(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`
            flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors
            ${dragOver ? "border-green-500 bg-green-900/30" : "border-zinc-600 hover:border-slate-400 hover:bg-zinc-900"}
            ${uploading ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          {uploading ? (
            <>
              <div className="h-5 w-5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
              <span className="text-sm text-zinc-500">Uploading...</span>
            </>
          ) : imagePreview ? (
            <>
              <span className="relative inline-block h-32 w-auto">
                <NextImage src={imagePreview} alt="Product preview" fill style={{ objectFit: "contain" }} className="rounded-lg" />
              </span>
              <span className="text-xs text-zinc-500">Click or drop to replace</span>
            </>
          ) : (
            <>
              <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-zinc-500">Drag & drop or click to upload</span>
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
            }}
          />
        </div>

        {uploadError && <p className="mt-1 text-xs text-red-400">{uploadError}</p>}

        {imagePreview && (
          <button
            type="button"
            onClick={handleRemoveImage}
            className="mt-2 text-xs text-red-500 hover:underline"
          >
            Remove image
          </button>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-slate-900 px-6 py-4 text-lg font-bold text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
