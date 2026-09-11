import PostGigForm from "@/components/PostGigForm";
import { requirePerformer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewGigPage() {
  const performer = await requirePerformer("/gigs/new");

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-orange-400">Post a gig</p>
      <h1 className="mt-2 font-display text-3xl text-white">Where are you playing?</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Drop a pin, add a time, and it shows up on the discovery map.
      </p>
      <div className="mt-8">
        <PostGigForm performer={performer} />
      </div>
    </main>
  );
}
