import { AlertTriangle } from "lucide-react";

export default function DisclaimerBanner() {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-[var(--warning)]/25 bg-[var(--warning-surface)] px-4 py-4 sm:px-5">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--warning)]/25 bg-[var(--surface)] text-[var(--warning)]">
        <AlertTriangle aria-hidden="true" className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-1.5" aria-hidden="true">
          <span className="h-1 w-3 rounded-sm bg-[var(--warning)]" />
          <span className="h-1 w-3 rounded-sm bg-[var(--warning)]/60" />
          <span className="h-1 w-3 rounded-sm bg-[var(--warning)]/30" />
        </div>
        <p className="text-sm font-semibold leading-snug text-[var(--foreground)]">
          Automated scan only. Covers approximately 57% of WCAG criteria.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--foreground-muted)]">
          Some violations require manual review. The certificate is an auditable
          record, not a legal guarantee of compliance.
        </p>
      </div>
    </div>
  );
}
