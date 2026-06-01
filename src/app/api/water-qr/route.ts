import { NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const size = parseInt(searchParams.get("size") ?? "300");
  const margin = parseInt(searchParams.get("margin") ?? "2");

  if (!token) {
    return new Response("Missing token", { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/water?h=${token}`;

  try {
    const buffer = await QRCode.toBuffer(url, {
      type: "png",
      width: size,
      margin,
      color: { dark: "#1a1a1a", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("QR generation failed", { status: 500 });
  }
}