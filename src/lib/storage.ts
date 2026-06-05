import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

// ── Buckets ────────────────────────────────────────────────────────
export const BUCKETS = {
  BRAND_LOGOS: "brand-logos",
  PRODUCT_IMAGES: "product-images",
  CONTACTS_IMPORTS: "contacts-imports",
  VIDEOS: "videos",
  WATER_PHOTOS: "water-photos",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

// ── S3 client (MinIO is S3-compatible) ─────────────────────────────
const region = process.env.STORAGE_REGION || "us-east-1";
const endpoint = process.env.STORAGE_ENDPOINT || "http://127.0.0.1:9000";
const publicBaseUrl = process.env.NEXT_PUBLIC_STORAGE_BASE_URL || endpoint;

export const s3 = new S3Client({
  region,
  endpoint,
  forcePathStyle: true, // MinIO requires path-style
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY || "",
    secretAccessKey: process.env.STORAGE_SECRET_KEY || "",
  },
});

const prefix = process.env.STORAGE_BUCKET_PREFIX || "";

// ── Helpers ────────────────────────────────────────────────────────
export function publicUrl(bucket: BucketName | string, key: string): string {
  const fullKey = prefix ? `${prefix}/${key}` : key;
  return `${publicBaseUrl}/${bucket}/${fullKey}`;
}

export type UploadInput = {
  bucket: BucketName | string;
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
};

export async function uploadFile(input: UploadInput): Promise<{ url: string }> {
  const fullKey = prefix ? `${prefix}/${input.key}` : input.key;
  await s3.send(
    new PutObjectCommand({
      Bucket: input.bucket,
      Key: fullKey,
      Body: input.body,
      ContentType: input.contentType,
    })
  );
  return { url: publicUrl(input.bucket, input.key) };
}

export async function deleteFile(bucket: BucketName | string, key: string): Promise<void> {
  const fullKey = prefix ? `${prefix}/${key}` : key;
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: fullKey }));
}

export async function listFiles(
  bucket: BucketName | string,
  prefix_?: string
): Promise<{ key: string; size: number; lastModified: Date }[]> {
  const fullPrefix = prefix ? `${prefix}/${prefix_ || ""}` : prefix_ || undefined;
  const res = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: fullPrefix,
    })
  );
  return (res.Contents || []).map((obj) => ({
    key: obj.Key || "",
    size: obj.Size || 0,
    lastModified: obj.LastModified || new Date(0),
  }));
}

// ── Key builders (single source of truth) ──────────────────────────
export const storageKeys = {
  brandLogo: (brandId: string, name: string) => `${brandId}/${name}`,
  productImage: (productId: string, ext: string) =>
    `products/${productId}/${randomUUID()}.${ext}`,
  contactsImport: (brandId: string, name: string) =>
    `${brandId}/${Date.now()}-${name}`,
};
