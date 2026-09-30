"use client";

import dynamic from "next/dynamic";
import { unstable_rethrow } from "next/navigation";
import { useState } from "react";
import { createGigAction } from "@/app/actions/gigs";
import { MYSTIC_CENTER } from "@/lib/map-style";
import { timeZoneAt } from "@/lib/tz-at";
import type { Performer } from "@/lib/types";
import { toVenueDateTimeLocal, venueZoneLabel, venueZoneLongName } from "@/lib/venue-time";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
});

export default function PostGigForm({
  performer,
  initialDateTime,
}: {
  performer: Performer;
  /** Stored UTC instant. Prefilled as venue wall time, not the browser zone. */
  initialDateTime?: string;
}) {
  const [lat, setLat] = useState<number | null>(MYSTIC_CENTER.lat);
  const [lng, setLng] = useState<number | null>(MYSTIC_CENTER.lng);
  const [error, setError] = useState<string | null>(null);
  const enteredZone = lat != null && lng != null ? timeZoneAt(lat, lng) : null;
  const zoneHint = `Entered as ${venueZoneLongName(enteredZone)} (${venueZoneLabel(enteredZone)})`;

  return (
    <form
      className="space-y-4"
      action={async (formData) => {
        setError(null);
        try {
          await createGigAction(formData);
        } catch (err) {
          unstable_rethrow(err);
          setError(err instanceof Error ? err.message : "Could not post gig.");
        }
      }}
    >
      <p className="text-sm text-zinc-400">
        Posting as <span className="text-accent">{performer.name}</span>
      </p>
      <Field label="Title" name="title" required placeholder="Late set downtown" />
      <label className="block text-sm text-zinc-300">
        Description
        <textarea
          name="description"
          rows={4}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          placeholder="Who's playing, what to expect, door time..."
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-zinc-300">
          Category
          <select
            name="category"
            defaultValue={performer.category}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          >
            <option value="solo">Solo</option>
            <option value="band">Band</option>
            <option value="dj">DJ</option>
          </select>
        </label>
        <label className="block text-sm text-zinc-300">
          Date and time
          <span id="gig-time-zone" className="mt-0.5 block text-xs text-zinc-500">
            {zoneHint}
          </span>
          <input
            type="datetime-local"
            name="datetime"
            required
            aria-describedby="gig-time-zone"
            defaultValue={initialDateTime ? toVenueDateTimeLocal(initialDateTime) : undefined}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </label>
      </div>
      <LocationPicker
        lat={lat}
        lng={lng}
        onChange={(coords) => {
          setLat(coords.lat);
          setLng(coords.lng);
        }}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-zinc-300">
          Latitude
          <input
            name="lat"
            type="number"
            step="any"
            required
            value={lat ?? ""}
            onChange={(event) =>
              setLat(event.target.value === "" ? null : Number(event.target.value))
            }
            placeholder="41.3543"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Longitude
          <input
            name="lng"
            type="number"
            step="any"
            required
            value={lng ?? ""}
            onChange={(event) =>
              setLng(event.target.value === "" ? null : Number(event.target.value))
            }
            placeholder="-71.9665"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </label>
      </div>
      <Field
        label="Venue / location label"
        name="label"
        required
        placeholder="Downtown Mystic"
      />
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      <button
        type="submit"
        className="w-full rounded-lg bg-accent py-3 font-medium text-zinc-950 hover:bg-accent-hover"
      >
        Publish gig
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm text-zinc-300">
      {label}
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
      />
    </label>
  );
}
