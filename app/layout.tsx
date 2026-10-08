import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import type { ReactNode } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import VoiceShortcuts from "@/components/VoiceShortcuts";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "A11yFix — Automated Accessibility Repair",
  description:
    "Scan HTML for WCAG violations, auto-fix three types, verify by re-scanning, and certify the result.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${inter.className} min-h-screen bg-background text-foreground antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <VoiceShortcuts />
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(ellipse_at_50%_0%,rgba(8,126,114,0.045),transparent_55%)] pt-16 dark:bg-[radial-gradient(ellipse_at_50%_0%,rgba(98,214,190,0.06),transparent_55%)]">
            {children}
          </main>
          <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
            <div className="mx-auto flex max-w-[1248px] flex-col gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between md:px-8">
              <div className="max-w-2xl">
                <p className="text-xs font-medium leading-relaxed text-[var(--foreground-muted)]">
                  A11yFix — Automated accessibility repair. Automated scan only;
                  covers approximately 57% of WCAG criteria.
                </p>
              </div>
              <nav
                aria-label="Footer"
                className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500"
              >
                <Link
                  href="/docs"
                  className="transition-colors hover:text-gray-900"
                >
                  Docs
                </Link>
                <span aria-hidden="true">·</span>
                <Link
                  href="/history"
                  className="transition-colors hover:text-gray-900"
                >
                  History
                </Link>
                <span aria-hidden="true">·</span>
                <a
                  href="https://www.w3.org/WAI/WCAG21/quickref/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-gray-900"
                >
                  WCAG Quick Reference
                </a>
              </nav>
            </div>
          </footer>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
