import Discovery from "@/components/Discovery";
import { gigs, performers } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [gigRows, performerRows] = await Promise.all([gigs.list(), performers.list()]);
  return <Discovery gigs={gigRows} performers={performerRows} />;
}
