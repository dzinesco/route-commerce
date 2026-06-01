"use client";

import NextImage from "next/image";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadProductImage } from "@/actions/products/upload-image";
import { createProduct } from "@/actions/products/create-product";

export default function NewProductForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string>("");

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = parseFloat(formData.get("price") as string);
    const type = formData.get("type") as string;
    const brandId = formData.get("brand_id") as string;
    const active = formData.get("active") === "true";

    // Use pendingImageUrl if image was uploaded, otherwise null
    const imageUrl = pendingImageUrl || null;
    const isTaxable = formData.get("is_taxable") === "true";
    const pickup_type = formData.get("pickup_type") as string;

    const result = await createProduct(brandId, {
      name,
      description,
      price,
      type,
      active,
      image_url: imageUrl,
      is_taxable: isTaxable,
      pickup_type,
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

      <div>
        <label className="block text-sm font-medium text-zinc-300">
          Product Name
        </label>
        <input
          name="name"
          required
          className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-slate-900"
          placeholder="e.g. Dozen Sweet Corn"
          autoComplete="off"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300">
          Description
        </label>
        <textarea
          name="description"
          rows={3}
          className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-slate-900"
          placeholder="e.g. Fresh-picked Olathe sweet corn."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300">
            Price ($)
          </label>
          <input
            name="price"
            type="number"
            step="0.01"
            required
            className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-slate-900"
            placeholder="12.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">
            Type
          </label>
          <select
            name="type"
            required
            className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-slate-900"
          >
            <option value="Pickup">Pickup</option>
            <option value="Shipping">Shipping</option>
            <option value="Pickup & Shipping">Pickup & Shipping</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300">
          Brand
        </label>
        <select
          name="brand_id"
          required
          className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-slate-900"
        >
          <option value="">Select brand...</option>
          <option value="64294306-5f42-463d-a5e8-2ad6c81a96de">
            Tuxedo Corn
          </option>
          <option value="b1cb7a96-d82b-40b1-80b1-d6dd26c56e28">
            Indian River Direct
          </option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300">Taxable</label>
        <p className="text-xs text-zinc-500 mb-2">Tax applied at checkout for shipping orders in nexus states. Disable for non-taxable items like apparel or cooler boxes.</p>
        <select
          name="is_taxable"
          className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-slate-900"
        >
          <option value="true">Yes — taxable (default)</option>
          <option value="false">No — non-taxable</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300">Pickup Type</label>
        <p className="text-xs text-zinc-500 mb-2">Shed pickup uses the product description as the location — no stop required at checkout.</p>
        <select
          name="pickup_type"
          className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-slate-900"
        >
          <option value="scheduled_stop">Scheduled Stop — requires stop selection at checkout</option>
          <option value="shed">Shed Pickup — uses description as location</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300">
          Active
        </label>
        <select
          name="active"
          className="mt-1 w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-zinc-100 outline-none focus:border-slate-900"
        >
          <option value="true">Yes — show on storefront</option>
          <option value="false">No — hide from storefront</option>
        </select>
      </div>

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

        <a
          href="/admin/products"
          className="rounded-xl border border-zinc-600 px-6 py-3 font-medium text-zinc-300"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}