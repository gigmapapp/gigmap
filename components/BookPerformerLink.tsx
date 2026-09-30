import Link from "next/link";
import { bookingsOpenForPerformer } from "@/lib/auth/access";

const buttonClass =
  "rounded-lg bg-accent px-4 py-2 text-center text-sm font-medium text-zinc-950 hover:bg-accent-hover";

export default function BookPerformerLink({
  performer,
}: {
  performer: { id: string; claimed: boolean };
}) {
  if (!bookingsOpenForPerformer(performer)) return null;
  return (
    <Link href={`/performers/${performer.id}/book`} className={buttonClass}>
      Request to book
    </Link>
  );
}
