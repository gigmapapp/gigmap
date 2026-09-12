"use client";

import dynamic from "next/dynamic";
import { unstable_rethrow } from "next/navigation";
import { useState } from "react";
import { createGigAction } from "@/app/actions/gigs";
import { AUSTIN_CENTER } from "@/lib/map-style";
import type { Performer } from "@/lib/types";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
});

export default function PostGigForm({ performer }: { performer: Performer }) {
  const [lat, setLat] = useState<number | null>(AUSTIN_CENTER.lat);
  const [lng, setLng] = useState<number | null>(AUSTIN_CENTER.lng);
  const [error, setError] = useState<string | null>(null);

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
        Posting as <span className="text-orange-300">{performer.name}</span>
      </p>
      <Field label="Title" name="title" required placeholder="Late set at Antone's" />
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
          <input
            type="datetime-local"
            name="datetime"
            required
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
            placeholder="30.2672"
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
            placeholder="-97.7431"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </label>
      </div>
      <Field
        label="Venue / location label"
        name="label"
        required
        placeholder="Hotel Vegas, 1502 E 6th St"
      />
      {error ? <p className="text-sm text-orange-300">{error}</p> : null}
      <button
        type="submit"
        className="w-full rounded-lg bg-orange-500 py-3 font-medium text-white hover:bg-orange-600"
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
