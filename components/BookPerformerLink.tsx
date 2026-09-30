import Link from "next/link";
import { bookingsOpenForPerformer } from "@/lib/auth/access";

const buttonClass =
  "rounded-lg bg-accent px-4 py-2 text-center text-sm font-medium text-zinc-950 hover:bg-accent-hover";

const closedClass =
  "rounded-lg bg-zinc-800 px-4 py-2 text-center text-sm text-zinc-500";

export default function BookPerformerLink({
  performer,
}: {
  performer: { id: string; claimed: boolean };
}) {
  if (!bookingsOpenForPerformer(performer)) {
    return (
      <span className={closedClass} title="Demo profile. Booking requests are closed.">
        Booking closed
      </span>
    );
  }
  return (
    <Link href={`/performers/${performer.id}/book`} className={buttonClass}>
      Request to book
    </Link>
  );
}
