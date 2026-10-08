"use client";

import Link from "next/link";
import { Download, ExternalLink, Link2 } from "lucide-react";
import { toast } from "sonner";
import CertificateQR from "@/components/CertificateQR";
import StatusBadge from "@/components/StatusBadge";
import type { Certificate, CertificateStatus } from "@/types";

interface CertificateCardProps {
  certificate: Certificate;
  saved: boolean;
}

function getBadgeStatus(status: CertificateStatus) {
  return status;
}

function Stat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: number;
  valueClassName: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] p-4 transition-[border-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-[var(--border-strong)]">
      <p className="text-xs font-medium text-[var(--foreground-muted)]">
        {label}
      </p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}

export default function CertificateCard({
  certificate,
  saved,
}: CertificateCardProps) {
  function downloadCertificate() {
    const blob = new Blob([JSON.stringify(certificate, null, 2)], {
      type: "application/json",
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `a11yfix-${certificate.id}.json`;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/certificate/${encodeURIComponent(certificate.id)}`
      );
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link to clipboard");
    }
  }

  return (
    <article className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] transition-[border-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-[var(--accent)]/35">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-5 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]">
            <Link2 aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-1.5" aria-hidden="true">
              <span className="h-1 w-3 rounded-sm bg-[var(--accent)]" />
              <span className="h-1 w-3 rounded-sm bg-[var(--accent)]/60" />
              <span className="h-1 w-3 rounded-sm bg-[var(--accent)]/30" />
            </div>
            <h3 className="text-lg font-semibold leading-snug tracking-tight text-[var(--foreground)]">
              Certificate of Automated Repair
            </h3>
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-3">
          <StatusBadge status={getBadgeStatus(certificate.status)} />
          <CertificateQR id={certificate.id} size={96} />
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        <dl className="space-y-3 text-sm leading-relaxed">
          <div className="flex flex-wrap items-baseline gap-2">
            <dt className="font-medium">Certificate ID:</dt>
            <dd
              className="break-all font-mono text-xs text-[var(--foreground-muted)]"
              title={certificate.id}
            >
              {certificate.id.slice(0, 8)}…
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <dt className="font-medium">Timestamp:</dt>
            <dd className="text-[var(--foreground-muted)]">
              {new Date(certificate.createdAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
              Summary
            </dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-[var(--foreground)]">
              {certificate.summary}
            </dd>
          </div>
        </dl>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Before"
            value={certificate.violationsBefore.length}
            valueClassName="text-[var(--danger)]"
          />
          <Stat
            label="Fixed"
            value={certificate.fixesApplied.length}
            valueClassName="text-[var(--success)]"
          />
          <Stat
            label="After"
            value={certificate.violationsAfter.length}
            valueClassName="text-[var(--warning)]"
          />
          <Stat
            label="Regressions"
            value={certificate.regressions.length}
            valueClassName={
              certificate.regressions.length > 0
                ? "text-[var(--danger)]"
                : "text-[var(--foreground-muted)]"
            }
          />
        </div>

        <div className="flex flex-wrap gap-3 border-t border-[var(--border)] pt-5">
          <button
            type="button"
            onClick={downloadCertificate}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] transition-[background-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] sm:w-auto"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            Download JSON
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors duration-150 ease-out hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] sm:w-auto"
          >
            <Link2 aria-hidden="true" className="h-4 w-4" />
            Copy Link
          </button>
          <Link
            href={`/certificate/${encodeURIComponent(certificate.id)}`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors duration-150 ease-out hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] sm:w-auto"
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            Open public link
          </Link>
        </div>

        {!saved && (
          <p className="rounded-lg border border-[var(--warning)]/25 bg-[var(--warning-surface)] px-4 py-3 text-xs leading-relaxed text-[var(--warning)]">
            ⚠ Could not save to history (Supabase unavailable). Download to
            keep a copy.
          </p>
        )}
      </div>
    </article>
  );
}
