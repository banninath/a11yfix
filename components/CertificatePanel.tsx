"use client";

import { FileCheck } from "lucide-react";
import CertificateCard from "@/components/CertificateCard";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import type { Certificate } from "@/types";

interface CertificatePanelProps {
  certificate: Certificate | null;
  saved?: boolean;
  loading?: boolean;
}

export default function CertificatePanel({
  certificate,
  saved = false,
  loading = false,
}: CertificatePanelProps) {
  return (
    <section className="space-y-4">
      <DisclaimerBanner />

      {loading ? (
        <div
          aria-label="Loading certificate"
          className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-[var(--surface-raised)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/5 animate-pulse rounded-sm bg-[var(--surface-raised)]" />
              <div className="h-3 w-3/5 animate-pulse rounded-sm bg-[var(--surface-inset)]" />
            </div>
          </div>
          <div className="h-4 w-3/5 animate-pulse rounded-sm bg-[var(--surface-inset)]" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--surface-inset)]"
              />
            ))}
          </div>
          <div className="h-11 w-36 animate-pulse rounded-lg bg-[var(--surface-raised)]" />
        </div>
      ) : certificate ? (
        <CertificateCard certificate={certificate} saved={saved} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-10 text-center sm:px-6">
          <div aria-hidden="true" className="mb-6 flex justify-center gap-1">
            <span className="h-1 w-5 rounded-sm bg-[var(--audit-trace-muted)]" />
            <span className="h-1 w-5 rounded-sm bg-[var(--accent)]" />
            <span className="h-1 w-5 rounded-sm bg-[var(--audit-trace-muted)]" />
          </div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]">
            <FileCheck aria-hidden="true" className="h-6 w-6" />
          </div>
          <p className="mt-4 text-base font-semibold tracking-tight text-[var(--foreground)]">
            No certificate yet
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-[var(--foreground-muted)]">
            Run a scan to generate an auditable certificate of automated repair.
          </p>
        </div>
      )}
    </section>
  );
}
