import { createPerformerAction } from "@/app/actions/performers";

export default function NewPerformerPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-orange-400">New profile</p>
      <h1 className="mt-2 font-display text-3xl text-white">Create a performer</h1>
      <p className="mt-2 text-sm text-zinc-400">
        This writes to the local store and sets the stub session cookie to your new profile.
      </p>
      <form action={createPerformerAction} className="mt-8 space-y-4">
        <label className="block text-sm text-zinc-300">
          Name
          <input
            name="name"
            required
            placeholder="Stage or band name"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Category
          <select
            name="category"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
            defaultValue="solo"
          >
            <option value="solo">Solo</option>
            <option value="band">Band</option>
            <option value="dj">DJ</option>
          </select>
        </label>
        <label className="block text-sm text-zinc-300">
          City
          <input
            name="city"
            defaultValue="Austin, TX"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Genres
          <input
            name="genres"
            placeholder="house, disco"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Bio
          <textarea
            name="bio"
            rows={4}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-orange-500 py-3 font-medium text-white hover:bg-orange-600"
        >
          Save profile
        </button>
      </form>
    </main>
  );
}
