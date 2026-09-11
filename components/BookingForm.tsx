"use client";

import { unstable_rethrow } from "next/navigation";
import { useState } from "react";
import { createBookingAction } from "@/app/actions/bookings";
import type { Performer } from "@/lib/types";

export default function BookingForm({ performer }: { performer: Performer }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      action={async (formData) => {
        setError(null);
        try {
          await createBookingAction(formData);
        } catch (err) {
          unstable_rethrow(err);
          setError(err instanceof Error ? err.message : "Could not send request.");
        }
      }}
    >
      <input type="hidden" name="performerId" value={performer.id} />
      <Field label="Your name" name="contactName" required placeholder="Jordan Lee" />
      <Field
        label="Email"
        name="contactEmail"
        type="email"
        required
        placeholder="you@email.com"
      />
      <label className="block text-sm text-zinc-300">
        Event details
        <textarea
          name="eventDetails"
          required
          rows={4}
          placeholder="Private birthday on a backyard deck, 40 guests, 2-hour set..."
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-zinc-300">
          Preferred date
          <input
            type="date"
            name="preferredDate"
            required
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </label>
        <Field
          label="Preferred location"
          name="preferredLocation"
          required
          placeholder="East Austin backyard"
        />
      </div>
      <label className="block text-sm text-zinc-300">
        Message
        <textarea
          name="message"
          rows={3}
          placeholder="Budget range, must-play songs, parking notes..."
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
        />
      </label>
      {error ? <p className="text-sm text-orange-300">{error}</p> : null}
      <button
        type="submit"
        className="w-full rounded-lg bg-orange-500 py-3 font-medium text-white hover:bg-orange-600"
      >
        Send request
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block text-sm text-zinc-300">
      {label}
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
      />
    </label>
  );
}
