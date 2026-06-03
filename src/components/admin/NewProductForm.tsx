"use client";

import NextImage from "next/image";
import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadProductImage } from "@/actions/products/upload-image";
import { createProduct } from "@/actions/products/create-product";
import { AdminInput, AdminTextInput, AdminTextarea, AdminSelect } from "./design-system";

type Props = {
  defaultBrandId?: string;
  brands?: { id: string; name: string }[];
  lockBrand?: boolean;
};

export default function NewProductForm({ defaultBrandId = "", brands = [], lockBrand = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string>("");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [type, setType] = useState("Pickup");
  const [brandId, setBrandId] = useState(defaultBrandId);
  const [isTaxable, setIsTaxable] = useState("true");
  const [pickupType, setPickupType] = useState("scheduled_stop");
  const [active, setActive] = useState("true");

  // Build the brand options. If the server provided a list, use it; otherwise
  // fall back to the historical hardcoded list so the form still works in
  // environments where getBrands() failed or returned empty.
  const brandOptions = brands.length > 0
    ? brands
    : [
        { id: "64294306-5f42-463d-a5e8-2ad6c81a96de", name: "Tuxedo Corn" },
        { id: "b1cb7a96-d82b-40b1-80b1-d6dd26c56e28", name: "Indian River Direct" },
      ];
  const brandSelectOptions = brandOptions.map((b) => ({ value: b.id, label: b.name }));

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
    const result = await uploadProductImage("__NEW__", resizedFile);
    setUploading(false);

    if (result.success) {
      setPendingImageUrl(result.imageUrl);
      setImagePreview(result.imageUrl);
    } else {
      setUploadError(result.error ?? "Upload failed.");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Use pendingImageUrl if image was uploaded, otherwise null
    const imageUrl = pendingImageUrl || null;

    const result = await createProduct(brandId, {
      name,
      description,
      price: parseFloat(price),
      type,
      active: active === "true",
      image_url: imageUrl,
      is_taxable: isTaxable === "true",
      pickup_type: pickupType,
    });

    if (!result.success) {
      setError(result.error ?? "Failed to create product");
      setLoading(false);
      return;
    }

    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 max-w-xl space-y-6">
      {error && (
        <div className="rounded-xl bg-red-900/30 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      <AdminInput label="Product Name" required>
        <AdminTextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Dozen Sweet Corn"
          autoComplete="off"
        />
      </AdminInput>

      <AdminInput label="Description">
        <AdminTextarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="e.g. Fresh-picked Olathe sweet corn."
        />
      </AdminInput>

      <div className="grid grid-cols-2 gap-4">
        <AdminInput label="Price ($)" required>
          <AdminTextInput
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="12.00"
          />
        </AdminInput>

        <AdminInput label="Type" required>
          <AdminSelect
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { value: "Pickup", label: "Pickup" },
              { value: "Shipping", label: "Shipping" },
              { value: "Pickup & Shipping", label: "Pickup & Shipping" },
            ]}
          />
        </AdminInput>
      </div>

      <AdminInput label="Brand" required>
        {lockBrand ? (
          // brand_admin / store_employee — brand is fixed by their admin_users record
          <div className="w-full rounded-lg border border-[var(--admin-border)] bg-stone-50 px-3 py-2.5 text-sm text-[var(--admin-text-primary)]">
            {brandOptions.find((b) => b.id === brandId)?.name ?? brandId}
          </div>
        ) : (
          <AdminSelect
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            options={[
              { value: "", label: brands.length > 0 ? "Select brand..." : "Loading brands..." },
              ...brandSelectOptions,
            ]}
            disabled={brands.length === 0 && defaultBrandId === ""}
          />
        )}
        {!lockBrand && brands.length === 0 && (
          <p className="mt-1 text-xs text-stone-500">
            Loading available brands — if this persists, check the admin Brands settings.
          </p>
        )}
      </AdminInput>

      <AdminInput label="Taxable" helpText="Tax applied at checkout for shipping orders in nexus states. Disable for non-taxable items like apparel or cooler boxes.">
        <AdminSelect
          value={isTaxable}
          onChange={(e) => setIsTaxable(e.target.value)}
          options={[
            { value: "true", label: "Yes — taxable (default)" },
            { value: "false", label: "No — non-taxable" },
          ]}
        />
      </AdminInput>

      <AdminInput label="Pickup Type" helpText="Shed pickup uses the product description as the location — no stop required at checkout.">
        <AdminSelect
          value={pickupType}
          onChange={(e) => setPickupType(e.target.value)}
          options={[
            { value: "scheduled_stop", label: "Scheduled Stop — requires stop selection at checkout" },
            { value: "shed", label: "Shed Pickup — uses description as location" },
          ]}
        />
      </AdminInput>

      <AdminInput label="Active">
        <AdminSelect
          value={active}
          onChange={(e) => setActive(e.target.value)}
          options={[
            { value: "true", label: "Yes — show on storefront" },
            { value: "false", label: "No — hide from storefront" },
          ]}
        />
      </AdminInput>

      <div>
        <label className="block text-sm font-medium text-zinc-300">Product Image</label>
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
            ${uploadError ? "border-red-400" : "border-zinc-600 hover:border-slate-400 hover:bg-zinc-900"}
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
            onClick={() => { setImagePreview(null); setPendingImageUrl(""); }}
            className="mt-2 text-xs text-red-500 hover:underline"
          >
            Remove image
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Product"}
        </button>

        <Link
          href="/admin/products"
          className="rounded-xl border border-zinc-600 px-6 py-3 font-medium text-zinc-300"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}