// TODO(migration): the route-trace feature was retired from the SaaS rebuild.
// The `harvest_lots` / `harvest_lot_events` tables and the
// `get_harvest_lots` / `get_events_for_lots` / `get_harvest_lot_detail`
// SECURITY DEFINER RPCs no longer exist in `db/schema/`. This route is
// stubbed to return an empty compliance payload so the admin/trace UI
// gracefully degrades. If route-trace comes back, re-introduce the
// tables in `db/schema/` and replace this stub with a real Drizzle query.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!brandId || !startDate || !endDate) {
    return new Response(
      JSON.stringify({ error: "Missing brandId, startDate, or endDate" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      lots: [],
      summary: {
        total_lots: 0,
        compliant: 0,
        non_compliant: 0,
        pending: 0,
        total_weight: 0,
        used_weight: 0,
        remaining_weight: 0,
        crops: [],
      },
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}
