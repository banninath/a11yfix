"use client";

import {
  Accessibility,
  BookOpen,
  HelpCircle,
  History,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

const navLinkClassName =
  "flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-[var(--foreground-muted)] transition-colors duration-150 ease-out hover:border-[var(--border)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-xl">
      <div className="relative mx-auto flex h-16 max-w-[1248px] items-center justify-between gap-4 px-4 sm:px-6 md:px-8">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--accent)]/30 bg-[var(--surface)] text-[var(--accent)] transition-transform duration-150 ease-out group-hover:-translate-y-0.5">
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-sm bg-[var(--accent)]" />
            <Accessibility aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
            A11yFix
          </span>
          <span
            aria-hidden="true"
            className="hidden h-1 items-center gap-1 sm:flex"
          >
            <span className="h-1 w-2 rounded-sm bg-[var(--accent)]" />
            <span className="h-1 w-2 rounded-sm bg-[var(--accent)]/60" />
            <span className="h-1 w-2 rounded-sm bg-[var(--accent)]/30" />
          </span>
        </Link>

        <div
          className={`${isMenuOpen ? "flex" : "hidden"} absolute inset-x-0 top-full flex-col gap-1 border-b border-[var(--border)] bg-[var(--background)] p-4 md:static md:flex md:flex-row md:items-center md:justify-end md:gap-1 md:border-0 md:bg-transparent md:p-0`}
        >
          <Link href="/" className={navLinkClassName}>
            <Accessibility aria-hidden="true" className="h-4 w-4" />
            <span>Scan</span>
          </Link>
          <Link href="/history" className={navLinkClassName}>
            <History aria-hidden="true" className="h-4 w-4" />
            <span>History</span>
          </Link>
          <Link href="/docs" className={navLinkClassName}>
            <BookOpen aria-hidden="true" className="h-4 w-4" />
            <span>Docs</span>
          </Link>

          <a
            href="https://www.w3.org/WAI/WCAG21/quickref/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WCAG quick reference"
            className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-[var(--foreground-muted)] transition-colors duration-150 ease-out hover:border-[var(--border)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
          >
            <HelpCircle aria-hidden="true" className="h-5 w-5" />
            <span className="md:hidden">WCAG quick reference</span>
          </a>
          <div className="hidden px-3 py-2 md:block md:px-0 md:py-0">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--foreground-muted)] transition-colors duration-150 ease-out hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
          >
            {isMenuOpen ? (
              <X aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Menu aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
