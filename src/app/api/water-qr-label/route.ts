import { NextResponse } from "next/server";
import QRCode from "qrcode";

function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// Derive a short "code" from the headgate name or token for the label
function deriveCode(name: string, token: string): string {
  // Use name if it looks like "Hubbard" or "North Field Gate 1"
  // Strip spaces, take first 6 chars of name in uppercase, append -1
  const namePart = name.replace(/\s+/g, "-").toUpperCase().slice(0, 6);
  return `${namePart}-1`;
}

export async function POST(request: Request) {
  try {
    const { token, name } = await request.json() as { token: string; name?: string };

    if (!token) {
      return new Response("Missing token", { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const url = `${baseUrl}/water?h=${escHtml(token)}`;
    const code = name ? deriveCode(name, token) : token.slice(0, 8).toUpperCase();
    const labelName = name ?? "Water Log";

    const dataUrl = await QRCode.toDataURL(url, {
      width: 360,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "H", // highest for physical signs
    });

    // Clean label design: name at top, code below, big QR, tiny URL
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>QR Label — ${escHtml(labelName)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 3in 5in; margin: 0; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #ffffff;
  }
  .label {
    width: 3in;
    padding: 0.35in 0.3in;
    text-align: center;
  }
  .headgate-name {
    font-size: 26pt;
    font-weight: 900;
    color: #000000;
    letter-spacing: -0.02em;
    line-height: 1.1;
    margin-bottom: 4px;
  }
  .code {
    font-size: 11pt;
    font-weight: 600;
    color: #555555;
    letter-spacing: 0.06em;
    margin-bottom: 18px;
  }
  .qr {
    display: flex;
    justify-content: center;
    margin-bottom: 14px;
  }
  .qr img {
    width: 2.1in;
    height: 2.1in;
    display: block;
  }
  .url {
    font-size: 7pt;
    color: #aaaaaa;
    word-break: break-all;
    line-height: 1.4;
  }
  @media print {
    body { background: #fff; }
    .label { padding: 0; }
  }
</style>
</head>
<body>
<div class="label">
  <div class="headgate-name">${escHtml(labelName)}</div>
  <div class="code">${escHtml(code)}</div>
  <div class="qr"><img src="${dataUrl}" alt="QR Code" /></div>
  <div class="url">${escHtml(url)}</div>
</div>
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch {
    return new Response("Server error", { status: 500 });
  }
}