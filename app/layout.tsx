import type { Metadata } from "next";
import { Manrope, Syne } from "next/font/google";
import Header from "@/components/Header";
import { getSessionUser } from "@/lib/auth/session";
import { performers } from "@/lib/repo";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Gig Map",
    template: "%s · Gig Map",
  },
  description: "Find live music near you. Browse upcoming gigs on a map and request to book performers.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  const performer = user ? await performers.getByUserId(user.id) : null;

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${syne.variable} h-full antialiased`}
    >
      <body className="flex h-dvh min-h-0 w-full min-w-0 flex-col overflow-hidden bg-canvas text-foreground">
        <svg width="0" height="0" aria-hidden="true" className="pointer-events-none absolute">
          <filter id="map-dusk" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0.82 0.08 0.02 0 0  0.02 0.84 0.04 0 0  0.02 0.10 0.92 0 0.05  0 0 0 1 0"
            />
          </filter>
        </svg>
        <Header
          account={
            user
              ? { performer: performer ? { id: performer.id, name: performer.name } : null }
              : null
          }
        />
        {/* Definite height so the home map fills the viewport instead of
            stretching to the gig list and parking pins below the fold. */}
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto">{children}</div>
      </body>
    </html>
  );
}
