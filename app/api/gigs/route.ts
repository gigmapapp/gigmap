import { gigs, performers } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET() {
  const [gigRows, performerRows] = await Promise.all([
    gigs.list(),
    performers.list(),
  ]);
  const byId = new Map(performerRows.map((performer) => [performer.id, performer]));
  return Response.json(
    gigRows.map((gig) => ({
      ...gig,
      performer: byId.get(gig.performerId) ?? null,
    })),
  );
}
