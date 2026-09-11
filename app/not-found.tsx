import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-orange-400">404</p>
      <h1 className="mt-3 font-display text-3xl text-white">Nothing playing here</h1>
      <p className="mt-2 text-sm text-zinc-400">That page is not on the map.</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
      >
        Back to gigs
      </Link>
    </main>
  );
}
