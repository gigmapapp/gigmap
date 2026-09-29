import Link from "next/link";
import type { Performer } from "@/lib/types";

export default function SessionBanner({
  performer,
}: {
  performer: Performer | null;
}) {
  return (
    <div className="border-b border-accent/20 bg-accent/10 px-4 py-2 text-center text-xs text-accent sm:text-sm">
      Temporary stub auth — pick a performer cookie, not real accounts.{" "}
      {performer ? (
        <>
          Acting as <span className="font-medium">{performer.name}</span>.
        </>
      ) : (
        <>
          Browsing as a fan.{" "}
          <Link href="/session" className="underline underline-offset-2">
            Act as a performer
          </Link>
        </>
      )}
    </div>
  );
}
