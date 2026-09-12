import type { Metadata } from "next";
import { Manrope, Syne } from "next/font/google";
import Header from "@/components/Header";
import SessionBanner from "@/components/SessionBanner";
import { getSessionPerformer } from "@/lib/auth";
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
  const performer = await getSessionPerformer();

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${syne.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas text-foreground">
        <SessionBanner performer={performer} />
        <Header performer={performer} />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
