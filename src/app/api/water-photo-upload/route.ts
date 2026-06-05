import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { uploadFile, publicUrl, BUCKETS } from "@/lib/storage";

const ALLOWED_BUCKETS = Object.values(BUCKETS);

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("wl_session")?.value ?? cookieStore.get("wl_admin_session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bucket = formData.get("bucket") as string | null;

    if (!file || !bucket) {
      return NextResponse.json({ error: "Missing file or bucket" }, { status: 400 });
    }

    if (!ALLOWED_BUCKETS.includes(bucket as (typeof ALLOWED_BUCKETS)[number])) {
      return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      return NextResponse.json({ error: "Only JPG or PNG allowed" }, { status: 400 });
    }

    const ext = file.type === "image/jpeg" ? "jpg" : "png";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const res = await uploadFile({
      bucket,
      key: fileName,
      body: buffer,
      contentType: file.type,
    });

    return NextResponse.json({ url: res.url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || "Server error" }, { status: 500 });
  }
}
