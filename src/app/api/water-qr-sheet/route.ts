import { NextResponse } from "next/server";
import QRCode from "qrcode";

function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function deriveCode(name: string, token: string): string {
  const namePart = name.replace(/\s+/g, "-").toUpperCase().slice(0, 6);
  return `${namePart}-1`;
}

export async function POST(request: Request) {
  try {
    const { headgates, baseUrl } = await request.json() as {
      headgates: Array<{ name: string; token: string }>;
      baseUrl?: string;
    };

    if (!headgates?.length) {
      return new Response("No headgates provided", { status: 400 });
    }

    const siteUrl = baseUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const qrDataUrls: string[] = [];
    for (const hg of headgates) {
      const url = `${siteUrl}/water?h=${hg.token}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "H",
      });
      qrDataUrls.push(dataUrl);
    }

    const rows = headgates.map((hg, i) => `
    <div class="card">
      <div class="name">${escHtml(hg.name)}</div>
      <div class="code">${escHtml(deriveCode(hg.name, hg.token))}</div>
      <div class="qr"><img src="${qrDataUrls[i]}" alt="QR for ${escHtml(hg.name)}" /></div>
      <div class="url">${escHtml(`${siteUrl}/water?h=${hg.token}`)}</div>
    </div>
  `).join("\n");

    return new Response(buildPrintSheet(headgates.length, rows), {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Server error", { status: 500 });
  }
}

function buildPrintSheet(count: number, rows: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Water Log QR Codes</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    padding: 20px;
    background: #ffffff;
  }
  .header {
    margin-bottom: 18px;
    padding-bottom: 12px;
    border-bottom: 2px solid #000;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }
  .header h1 {
    font-size: 16pt;
    font-weight: 900;
    color: #000;
    letter-spacing: -0.01em;
  }
  .header span {
    font-size: 10pt;
    color: #666;
  }
  /* 2-column grid for landscape letter, 3-column for larger sheets */
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
  .card {
    border: 2px solid #000000;
    padding: 16px 12px 12px;
    text-align: center;
    background: #ffffff;
    page-break-inside: avoid;
  }
  .name {
    font-size: 18pt;
    font-weight: 900;
    color: #000000;
    letter-spacing: -0.02em;
    line-height: 1.1;
    margin-bottom: 2px;
  }
  .code {
    font-size: 9pt;
    font-weight: 700;
    color: #555555;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .qr {
    display: flex;
    justify-content: center;
    margin-bottom: 8px;
  }
  .qr img {
    width: 1.65in;
    height: 1.65in;
    display: block;
  }
  .url {
    font-size: 6.5pt;
    color: #aaaaaa;
    word-break: break-all;
    line-height: 1.35;
  }
  @media print {
    @page { size: letter landscape; margin: 0.4in; }
    body { padding: 0; }
    .grid { gap: 14px; }
    .card { border: 1.5pt solid #000; padding: 12px 10px 10px; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>Water Log QR Codes</h1>
  <span>${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} — ${count} headgate${count !== 1 ? "s" : ""}</span>
</div>
<div class="grid">${rows}</div>
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;
}