// TODO(migration): the route-trace feature was retired from the SaaS rebuild.
// `get_harvest_lot_detail` no longer exists in `db/schema/`. This route
// used to generate a thermal-label PDF with a QR code pointing to the
// public trace page. Without lot data we can't render the sticker, so
// we return a tiny placeholder PDF. The `StickerPreviewModal` consumer
// already handles the empty state.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lotId = searchParams.get("lotId");

  if (!lotId) {
    return new Response("Missing lotId", { status: 400 });
  }

  // Minimal 1-page PDF saying the feature is retired. Hand-built so the
  // route doesn't need to instantiate pdf-lib at all (the route is
  // reached only by the StickerPreviewModal when route-trace data is
  // missing, which the SaaS rebuild always is).
  const pdfBody = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 288 144]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length 70>>stream
BT /F1 10 Tf 10 70 Td (Route-trace feature not configured.) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000104 00000 n
0000000192 00000 n
0000000253 00000 n
trailer<</Size 6/Root 1 0 R>>
startxref
368
%%EOF`;
  return new Response(pdfBody, {
    status: 200,
    headers: { "Content-Type": "application/pdf" },
  });
}
