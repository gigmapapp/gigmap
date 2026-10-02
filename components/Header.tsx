"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
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

const navLinkClass =
  "inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-secondary hover:bg-surface-hover hover:text-foreground";

const menuLinkClass =
  "flex min-h-11 items-center rounded-lg px-3 text-secondary hover:bg-surface-hover";

export default function Header({ account }: { account: HeaderAccount }) {
  const [open, setOpen] = useState(false);
  const performer = account?.performer ?? null;
  const accountHref = performer ? `/performers/${performer.id}` : "/account";
  const accountLabel = performer ? performer.name : "Finish profile";

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-line bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <Logo />
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={navLinkClass}>
              {link.label}
            </Link>
          ))}
          <Link
            href="/gigs/new"
            className="ml-1 inline-flex min-h-11 items-center rounded-lg bg-accent px-3 text-sm font-medium text-on-accent hover:bg-accent-hover"
          >
            Post a gig
          </Link>
        </nav>
        <div className="hidden items-center gap-1 text-sm md:flex">
          {account ? (
            <SignedInLinks
              href={accountHref}
              label={accountLabel}
              editHref={performer ? "/account?edit=1" : undefined}
            />
          ) : (
            <SignedOutLinks />
          )}
        </div>
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-lg text-secondary hover:bg-surface-hover md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? "Close menu" : "Menu"}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>
      {open ? (
        <div id="site-menu" className="space-y-1 border-t border-line px-4 py-3 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={menuLinkClass}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/gigs/new"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center rounded-lg bg-accent px-3 font-medium text-on-accent hover:bg-accent-hover"
          >
            Post a gig
          </Link>
          <div className="my-2 border-t border-line" />
          {account ? (
            <SignedInLinks
              href={accountHref}
              label={accountLabel}
              editHref={performer ? "/account?edit=1" : undefined}
              onNavigate={() => setOpen(false)}
              stacked
            />
          ) : (
            <SignedOutLinks onNavigate={() => setOpen(false)} stacked />
          )}
        </div>
      ) : null}
    </header>
  );
}

function SignedOutLinks({
  stacked = false,
  onNavigate,
}: {
  stacked?: boolean;
  onNavigate?: () => void;
}) {
  if (stacked) {
    return (
      <>
        <Link href="/sign-in" onClick={onNavigate} className={menuLinkClass}>
          Sign in
        </Link>
        <Link
          href="/sign-up"
          onClick={onNavigate}
          className="flex min-h-11 items-center rounded-lg bg-surface px-3 font-medium text-foreground hover:bg-surface-hover"
        >
          Sign up
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/sign-in" className={navLinkClass}>
        Sign in
      </Link>
      <Link
        href="/sign-up"
        className="inline-flex min-h-11 items-center rounded-lg bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-hover"
      >
        Sign up
      </Link>
    </>
  );
}

function SignedInLinks({
  href,
  label,
  editHref,
  stacked = false,
  onNavigate,
}: {
  href: string;
  label: string;
  editHref?: string;
  stacked?: boolean;
  onNavigate?: () => void;
}) {
  const linkClass = stacked
    ? "flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-3 text-secondary hover:bg-surface-hover"
    : "inline-flex min-h-11 max-w-48 items-center gap-2 rounded-lg px-3 text-sm text-secondary hover:bg-surface-hover hover:text-foreground";
  const editClass = stacked
    ? "flex min-h-11 items-center rounded-lg px-3 text-secondary hover:bg-surface-hover"
    : "inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-secondary hover:bg-surface-hover hover:text-foreground";
  const signOutClass = stacked
    ? "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-secondary hover:bg-surface-hover disabled:opacity-70"
    : "inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-70";

  return (
    <>
      <Link href={href} onClick={onNavigate} className={linkClass}>
        <AccountMark label={label} />
        <span className="truncate">{label}</span>
      </Link>
      {editHref ? (
        <Link href={editHref} onClick={onNavigate} className={editClass}>
          Edit profile
        </Link>
      ) : null}
      <form action={signOutAction}>
        <SignOutButton className={signOutClass} />
      </form>
    </>
  );
}

function SignOutButton({ className }: { className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

function AccountMark({ label }: { label: string }) {
  const initial = label.trim().charAt(0).toUpperCase() || "A";
  return (
    <span
      className="grid size-6 shrink-0 place-items-center rounded-full bg-accent/15 text-xs font-semibold text-accent ring-1 ring-accent/30"
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
