"use client";

import { useState } from "react";
import type { Fix, ImpactLevel, Violation } from "@/types";
import ScoreGauge from "@/components/ScoreGauge";
import ViolationCard from "@/components/ViolationCard";
import DiffViewer from "@/components/DiffViewer";
import HtmlPreview from "@/components/HtmlPreview";
import { useViolationNarrator } from "@/lib/useViolationNarrator";
import { CheckCircle2, Eye, EyeOff, Play, Square } from "lucide-react";

interface BeforeAfterPanelProps {
  before: Violation[];
  after: Violation[];
  fixes: Fix[];
  originalHtml?: string;
  fixedHtml?: string | null;
  loading?: boolean;
  verified?: boolean;
}

const impactWeights: Record<ImpactLevel, number> = {
  critical: 10,
  serious: 6,
  moderate: 3,
  minor: 1,
};

function computeScore(violations: Violation[]): number {
  const penalty = violations.reduce(
    (total, violation) => total + impactWeights[violation.impact],
    0
  );
  return Math.max(0, 100 - penalty);
}

function SkeletonColumn() {
  return (
    <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] p-4 sm:p-5" aria-hidden="true">
      <div className="flex items-center justify-between gap-4">
        <div className="h-4 w-20 animate-pulse rounded-sm bg-[var(--surface-raised)]" />
        <div className="h-20 w-20 animate-pulse rounded-full border-4 border-[var(--border)] bg-[var(--surface)]" />
      </div>
      <div className="h-8 animate-pulse rounded-lg bg-[var(--surface-raised)]" />
      <div className="h-24 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--surface)]" />
      <div className="h-24 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--surface)]" />
    </div>
  );
}

export default function BeforeAfterPanel({
  before,
  after,
  fixes,
  originalHtml = "",
  fixedHtml = null,
  loading = false,
  verified = false,
}: BeforeAfterPanelProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const {
    start: startNarration,
    stop: stopNarration,
    isNarrating,
    isSupported,
  } = useViolationNarrator({
    violations: before,
    score: computeScore(before),
  });

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-[border-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-[var(--border-strong)] sm:p-6 md:p-8">
      <div className="mb-6 flex items-start gap-4 border-b border-[var(--border)] pb-5">
        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-xs font-semibold text-[var(--accent)] tabular-nums">
          02
        </span>
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-1.5" aria-hidden="true">
            <span className="h-1 w-3 rounded-sm bg-[var(--accent)]" />
            <span className="h-1 w-3 rounded-sm bg-[var(--accent)]/60" />
            <span className="h-1 w-3 rounded-sm bg-[var(--accent)]/30" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
            Scan results
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--foreground-muted)]">
            Compare findings and scores before and after automatic fixes.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        {loading ? (
          <>
            <SkeletonColumn />
            <SkeletonColumn />
          </>
        ) : (
          <>
            <section className="min-w-0 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                  <span aria-hidden="true" className="flex items-center gap-1">
                    <span className="h-1.5 w-3 rounded-sm bg-[var(--danger)]" />
                    <span className="h-1.5 w-2 rounded-sm bg-[var(--danger)]/45" />
                  </span>
                  Before
                </h3>
                <div className="flex items-center gap-3">
                  <ScoreGauge score={computeScore(before)} label="Before" />
                  {isNarrating ? (
                    <button
                      type="button"
                      aria-label="Stop narration"
                      onClick={stopNarration}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
                    >
                      <Square aria-hidden="true" className="h-4 w-4" />
                      Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label="Read violations aloud"
                      onClick={startNarration}
                      disabled={!isSupported || before.length === 0}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
                    >
                      <Play aria-hidden="true" className="h-4 w-4" />
                      Read aloud
                    </button>
                  )}
                </div>
              </div>
              {before.length === 0 ? (
                <div className="flex items-start gap-3 rounded-lg border border-[var(--success)]/25 bg-[var(--success-surface)] p-4">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--success)]" />
                  <p className="text-sm leading-relaxed text-[var(--foreground)]">
                    No violations found 🎉
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {before.map((violation) => (
                    <ViolationCard key={violation.id} violation={violation} />
                  ))}
                </div>
              )}
            </section>

            <section className="min-w-0 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-inset)] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground-muted)]">
                  <span aria-hidden="true" className="flex items-center gap-1">
                    <span className="h-1.5 w-3 rounded-sm bg-[var(--accent)]" />
                    <span className="h-1.5 w-2 rounded-sm bg-[var(--accent)]/45" />
                  </span>
                  After
                </h3>
                {verified ? (
                  <ScoreGauge score={computeScore(after)} label="After" />
                ) : (
                  <span className="text-xs font-medium text-[var(--warning)]">Not verified</span>
                )}
              </div>
              <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium leading-relaxed text-[var(--foreground-muted)] tabular-nums">
                {verified
                  ? `${fixes.length} fixes applied · ${after.length} remaining`
                  : `${fixes.length} proposed fixes · verification not completed`}
              </p>
              {!verified ? (
                <p role="status" className="rounded-lg border border-[var(--warning)]/25 bg-[var(--warning-surface)] p-4 text-sm leading-relaxed text-[var(--foreground)]">
                  The re-scan did not complete. No repair is marked successful.
                </p>
              ) : after.length === 0 ? (
                <div className="flex items-start gap-3 rounded-lg border border-[var(--success)]/25 bg-[var(--success-surface)] p-4">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--success)]" />
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    All clear ✅
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {after.map((violation) => (
                    <ViolationCard
                      key={violation.id}
                      violation={violation}
                      showFix={fixes.some(
                        (fix) => fix.violationId === violation.id
                      )}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
      {!loading && fixedHtml !== null && (
        <>
          <DiffViewer before={originalHtml} after={fixedHtml} />
          <div className="mt-6 border-t border-[var(--border)] pt-6">
            <button
              type="button"
              aria-expanded={previewOpen}
              aria-controls="html-preview-content"
              onClick={() => setPreviewOpen((open) => !open)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
            >
              {previewOpen ? (
                <EyeOff aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Eye aria-hidden="true" className="h-4 w-4" />
              )}
              {previewOpen ? "Hide HTML preview" : "Show HTML preview"}
            </button>
            {previewOpen && (
              <div id="html-preview-content">
                <HtmlPreview
                  originalHtml={originalHtml}
                  fixedHtml={fixedHtml}
                />
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
