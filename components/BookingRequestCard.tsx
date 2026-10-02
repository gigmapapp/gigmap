"use client";

import { unstable_rethrow } from "next/navigation";
import { useRef, useState } from "react";
import {
  acceptBookingAction,
  cancelBookingAction,
  declineBookingAction,
} from "@/app/actions/bookings";
import type { AuthActionResult } from "@/lib/auth/result";
import type { BookingDecisionStatus, BookingStatus } from "@/lib/types";

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
};

function statusClass(status: BookingStatus): string {
  if (status === "accepted") return "text-emerald-300";
  if (status === "declined") return "text-rose-300";
  if (status === "cancelled") return "text-zinc-500";
  return "text-accent";
}

const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-zinc-950 hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70";

const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-800 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-70";

type StatusAction = (formData: FormData) => Promise<AuthActionResult>;

export default function BookingRequestCard({
  id,
  status,
  title,
  meta,
  body,
  note,
  contact,
  mode,
}: {
  id: string;
  status: BookingStatus;
  title: string;
  meta: string;
  body: string;
  note?: string;
  contact?: string;
  mode: "owner" | "requester";
}) {
  const [override, setOverride] = useState<{ base: BookingStatus; value: BookingStatus } | null>(null);
  const [pending, setPending] = useState<BookingDecisionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const shown = override && override.base === status ? override.value : status;

  async function respond(next: BookingDecisionStatus, action: StatusAction) {
    if (lock.current || shown !== "pending") return;
    lock.current = true;
    setPending(next);
    setError(null);
    setOverride({ base: status, value: next });
    const formData = new FormData();
    formData.set("bookingId", id);
    try {
      const result = await action(formData);
      if (!result.ok) {
        setOverride(null);
        setError(result.message);
      }
    } catch (err) {
      unstable_rethrow(err);
      setOverride(null);
      setError(err instanceof Error ? err.message : "Could not update that request.");
    } finally {
      setPending(null);
      lock.current = false;
    }
  }

  const saving =
    pending === "accepted" ? "Accepting..." : pending === "declined" ? "Declining..." : pending === "cancelled" ? "Cancelling..." : null;

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5" aria-busy={pending !== null}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={`uppercase tracking-wide ${statusClass(shown)}`}>
          {STATUS_LABEL[shown]}
          {saving ? <span className="ml-2 normal-case tracking-normal text-zinc-400">{saving}</span> : null}
        </span>
        <span className="text-zinc-500">{mode === "owner" ? "For you" : "Your request"}</span>
      </div>
      <h2 className="mt-2 font-medium break-words text-white">{title}</h2>
      <p className="mt-1 text-sm break-words text-zinc-400">{meta}</p>
      <p className="mt-3 text-sm break-words text-zinc-200">{body}</p>
      {note ? <p className="mt-2 text-sm break-words text-zinc-400">{note}</p> : null}
      {contact ? <p className="mt-3 text-xs break-words text-zinc-500">{contact}</p> : null}
      {mode === "owner" && status === "pending" && (shown === "pending" || pending !== null) ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className={primaryButtonClass}
            disabled={pending !== null}
            onClick={() => respond("accepted", acceptBookingAction)}
          >
            {pending === "accepted" ? "Accepting..." : "Accept"}
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={pending !== null}
            onClick={() => respond("declined", declineBookingAction)}
          >
            {pending === "declined" ? "Declining..." : "Decline"}
          </button>
        </div>
      ) : null}
      {mode === "requester" && status === "pending" && (shown === "pending" || pending !== null) ? (
        <div className="mt-4">
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={pending !== null}
            onClick={() => respond("cancelled", cancelBookingAction)}
          >
            {pending === "cancelled" ? "Cancelling..." : "Cancel request"}
          </button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-accent">
          {error}
        </p>
      ) : null}
    </article>
  );
}
