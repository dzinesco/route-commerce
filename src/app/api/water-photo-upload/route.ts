import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { svcHeaders } from "@/lib/svc-headers";

export async function POST(request: Request) {
  try {
    // Validate session — irrigators use wl_session, admins use wl_admin_session
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

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      return NextResponse.json({ error: "Only JPG or PNG allowed" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabasePat = process.env.SUPABASE_PAT!;

    const ext = file.type === "image/jpeg" ? "jpg" : "png";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`,
      {
        method: "POST",
        headers: {
          ...svcHeaders(supabasePat),
          "Content-Type": file.type,
          "x-upsert": "true",
        },
        body: uint8,
      }
    );

    if (!uploadRes.ok) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileName}`;
    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}