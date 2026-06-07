// TODO(migration): the route-trace feature was retired from the SaaS rebuild.
// See fsma-compliance/route.ts for context. `get_harvest_lot_detail` and
// `get_lot_orders` no longer exist in `db/schema/`. The stub returns a
// CSV body indicating the feature is unavailable so direct links from
// the admin UI degrade gracefully.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lotId = searchParams.get("lotId");
  const format = searchParams.get("format") ?? "csv";

  if (!lotId) {
    return new Response("Missing lotId", { status: 400 });
  }

  if (format === "pdf") {
    return new Response(
      "Route-trace feature not configured — PDF trace reports are unavailable.\n",
      {
        status: 501,
        headers: { "Content-Type": "text/plain" },
      },
    );
  }

  // CSV — return a single header row that downstream parsers can detect.
  const csv = "error,message\nretired,Route-trace feature not configured\n";
  return new Response(csv, {
    status: 501,
    headers: { "Content-Type": "text/csv" },
  });
}
