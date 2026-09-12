"use client";

import Link from "next/link";
import { useState } from "react";
import { clearSessionAction } from "@/app/actions/session";
import Logo from "@/components/Logo";
import type { Performer } from "@/lib/types";

const links = [
  { href: "/", label: "Map" },
  { href: "/performers", label: "Performers" },
  { href: "/bookings", label: "Bookings" },
];

export default function Header({ performer }: { performer: Performer | null }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Logo />
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/gigs/new"
            className="ml-1 rounded-lg bg-orange-500 px-3 py-2 font-medium text-white hover:bg-orange-600"
          >
            Post a gig
          </Link>
        </nav>
        <div className="hidden items-center gap-2 text-sm md:flex">
          {performer ? (
            <>
              <Link
                href={`/performers/${performer.id}`}
                className="max-w-40 truncate text-zinc-300 hover:text-white"
              >
                {performer.name}
              </Link>
              <form action={clearSessionAction}>
                <input type="hidden" name="next" value="/" />
                <button
                  type="submit"
                  className="rounded-lg px-3 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  Clear
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/session"
              className="rounded-lg bg-zinc-800 px-3 py-2 text-zinc-100 hover:bg-zinc-700"
            >
              Pick performer
            </Link>
          )}
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-zinc-200 hover:bg-zinc-800 md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label="Menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      {open ? (
        <div className="space-y-1 border-t border-zinc-800 px-4 py-3 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-zinc-200 hover:bg-zinc-800"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/gigs/new"
            onClick={() => setOpen(false)}
            className="block rounded-lg bg-orange-500 px-3 py-2 font-medium text-white"
          >
            Post a gig
          </Link>
          <Link
            href={performer ? `/performers/${performer.id}` : "/session"}
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800"
          >
            {performer ? `Acting as ${performer.name}` : "Pick performer"}
          </Link>
        </div>
      ) : null}
    </header>
  );
}
