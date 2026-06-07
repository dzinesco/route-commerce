// TODO(migration): the route-trace feature was retired from the SaaS rebuild.
// See fsma-compliance/route.ts for context. This route used to return a
// CSV report produced from the `get_harvest_lots` SECURITY DEFINER RPC,
// which no longer exists. The stub returns a "feature not configured"
// body so callers that link straight to this URL still get a meaningful
// response (rather than a generic 500).

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!brandId || !startDate || !endDate) {
    return new Response(
      "Missing brandId, startDate, or endDate",
      { status: 400 },
    );
  }

  return new Response(
    "Route-trace feature not configured — FSMA reports are unavailable in the SaaS rebuild.\n",
    {
      status: 501,
      headers: { "Content-Type": "text/plain" },
    },
  );
}
