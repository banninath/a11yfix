"use client";

import { Info, ShieldCheck } from "lucide-react";
import type { AuditCategory, AuditCheck, SiteAudit } from "@/types";

interface SiteAuditPanelProps {
  audit: SiteAudit | null;
  audits?: SiteAudit[];
  loading?: boolean;
}

const categories: Array<{ id: AuditCategory; label: string }> = [
  { id: "metadata", label: "Metadata" },
  { id: "language", label: "Language and locale" },
  { id: "sharing", label: "Structured data and sharing" },
  { id: "structure", label: "Document structure" },
  { id: "links", label: "Links and navigation" },
  { id: "performance", label: "Performance and security hints" },
];

const statusStyles = {
  pass: {
    text: "text-[var(--success)]",
    badge:
      "border-[var(--success)]/25 bg-[var(--success-surface)] text-[var(--success)]",
    dot: "bg-[var(--success)]",
    label: "Passed",
  },
  warn: {
    text: "text-[var(--warning)]",
    badge:
      "border-[var(--warning)]/25 bg-[var(--warning-surface)] text-[var(--warning)]",
    dot: "bg-[var(--warning)]",
    label: "Manual review",
  },
  fail: {
    text: "text-[var(--danger)]",
    badge:
      "border-[var(--danger)]/25 bg-[var(--danger-surface)] text-[var(--danger)]",
    dot: "bg-[var(--danger)]",
    label: "Failed",
  },
};

function CountPill({
  status,
  count,
}: {
  status: keyof typeof statusStyles;
  count: number;
}) {
  const style = statusStyles[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${style.badge}`}
    >
      {count} {style.label}
    </span>
  );
}

function CheckRow({ item }: { item: AuditCheck }) {
  const style = statusStyles[item.status];

  return (
    <li className="flex gap-3 border-t border-[var(--border)] py-3 first:border-t-0">
      <span
        aria-label={item.status}
        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-medium text-[var(--foreground)]">
            {item.label}
          </h4>
          {item.value ? (
            <span className="max-w-full break-all rounded-md border border-[var(--border)] bg-[var(--surface-inset)] px-2 py-0.5 font-mono text-xs text-[var(--foreground-muted)]">
              {item.value}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--foreground-muted)]">
          {item.message}
        </p>
        {item.suggestion && item.status !== "pass" ? (
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-[var(--foreground-muted)]">
            <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {item.suggestion}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-12 animate-pulse rounded-lg bg-[var(--surface-inset)]"
        />
      ))}
    </div>
  );
}

export default function SiteAuditPanel({
  audit,
  audits = [],
  loading = false,
}: SiteAuditPanelProps) {
  const reports = audits.length > 0 ? audits : audit ? [audit] : [];
  if (reports.length === 0 && !loading) return null;

  const isDomainReport = reports.length > 1 || audits.length === 1;
  const passedCount = reports.reduce((total, item) => total + item.passedCount, 0);
  const warnCount = reports.reduce((total, item) => total + item.warnCount, 0);
  const failCount = reports.reduce((total, item) => total + item.failCount, 0);
  const score = reports.length
    ? Math.round(
        reports.reduce((total, item) => total + item.score, 0) / reports.length,
      )
    : 0;
  const scoreColor =
    score >= 80
      ? "border-[var(--success)] text-[var(--success)]"
      : score >= 55
        ? "border-[var(--warning)] text-[var(--warning)]"
        : "border-[var(--danger)] text-[var(--danger)]";

  const categoryChecks = (category: AuditCategory) =>
    reports.flatMap((report) =>
      report.checks
        .filter((item) => item.category === category)
        .map((item) => ({
          ...item,
          id: `${report.url}:${item.id}`,
          label:
            isDomainReport && reports.length > 1
              ? `${new URL(report.url).pathname} — ${item.label}`
              : item.label,
        })),
    );

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--foreground)]">
          <ShieldCheck
            aria-hidden="true"
            className="h-5 w-5 text-[var(--accent)]"
          />
          {isDomainReport ? "Domain WCAG Audit" : "Live WCAG Audit"}
        </h2>
        {reports.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <CountPill status="pass" count={passedCount} />
            <CountPill status="warn" count={warnCount} />
            <CountPill status="fail" count={failCount} />
            <div
              aria-label={`Audit score ${score} out of 100`}
              className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-semibold tabular-nums ${scoreColor}`}
            >
              {score}
            </div>
          </div>
        ) : null}
      </div>

      {loading && !audit ? (
        <div className="pt-5">
          <SkeletonRows />
        </div>
      ) : reports.length > 0 ? (
        <div className="mt-5 space-y-2">
          {isDomainReport ? (
            <p className="text-sm text-[var(--foreground-muted)]">
              Checked {reports.length} page(s) on {reports[0]?.url}.
            </p>
          ) : null}
          <p className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] px-3 py-2 text-xs leading-relaxed text-[var(--foreground-muted)]">
            Automated scans cover approximately 57% of WCAG criteria. Some checks require manual review because automation cannot conclusively verify compliance.
          </p>
          {categories.map((category) => {
            const checks = categoryChecks(category.id);
            return (
              <details
                key={category.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] px-4"
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 py-3 text-sm font-medium text-[var(--foreground)]">
                  <span>{category.label}</span>
                  <span className="flex flex-wrap gap-1.5">
                    <span className="text-xs text-[var(--success)]">
                      {checks.filter((item) => item.status === "pass").length} passed
                    </span>
                    <span className="text-xs text-[var(--warning)]">
                      {checks.filter((item) => item.status === "warn").length} manual review
                    </span>
                    <span className="text-xs text-[var(--danger)]">
                      {checks.filter((item) => item.status === "fail").length} failed
                    </span>
                  </span>
                </summary>
                <ul className="pb-2">
                  {checks.map((item) => (
                    <CheckRow key={item.id} item={item} />
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
