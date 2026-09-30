"use client";

import Link from "next/link";
import { useState } from "react";
import { signOutAction } from "@/app/actions/auth";
import Logo from "@/components/Logo";

export type HeaderAccount = {
  performer: { id: string; name: string } | null;
} | null;

const links = [
  { href: "/", label: "Map" },
  { href: "/performers", label: "Performers" },
  { href: "/bookings", label: "Bookings" },
];

export default function Header({ account }: { account: HeaderAccount }) {
  const [open, setOpen] = useState(false);
  const performer = account?.performer ?? null;

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
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
            className="ml-1 rounded-lg bg-accent px-3 py-2 font-medium text-zinc-950 hover:bg-accent-hover"
          >
            Post a gig
          </Link>
        </nav>
        <div className="hidden items-center gap-2 text-sm md:flex">
          {account ? (
            <>
              <Link
                href={performer ? `/performers/${performer.id}` : "/account"}
                className="max-w-40 truncate text-zinc-300 hover:text-white"
              >
                {performer ? performer.name : "Finish profile"}
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-lg px-3 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-lg bg-zinc-800 px-3 py-2 text-zinc-100 hover:bg-zinc-700"
            >
              Sign in
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
            className="block rounded-lg bg-accent px-3 py-2 font-medium text-zinc-950 hover:bg-accent-hover"
          >
            Post a gig
          </Link>
          {account ? (
            <>
              <Link
                href={performer ? `/performers/${performer.id}` : "/account"}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800"
              >
                {performer ? performer.name : "Finish profile"}
              </Link>
              <form action={signOutAction}>
                <button type="submit" className="block w-full rounded-lg px-3 py-2 text-left text-zinc-300 hover:bg-zinc-800">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800"
            >
              Sign in
            </Link>
          )}
        </div>
      ) : null}
    </header>
  );
}
