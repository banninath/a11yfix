"use client";

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  Circle,
  Info,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { Violation } from "@/types";

interface ViolationCardProps {
  violation: Violation;
  showFix?: boolean;
  onExplanationLoaded?: (violationId: string, explanation: string) => void;
}

const impactStyles = {
  critical: {
    Icon: AlertCircle,
    icon: "text-[var(--danger)]",
    badge:
      "border-[var(--danger)]/25 bg-[var(--danger-surface)] text-[var(--danger)]",
  },
  serious: {
    Icon: AlertTriangle,
    icon: "text-[var(--danger)]",
    badge:
      "border-[var(--danger)]/25 bg-[var(--danger-surface)] text-[var(--danger)]",
  },
  moderate: {
    Icon: AlertTriangle,
    icon: "text-[var(--warning)]",
    badge:
      "border-[var(--warning)]/25 bg-[var(--warning-surface)] text-[var(--warning)]",
  },
  minor: {
    Icon: Circle,
    icon: "text-[var(--foreground-muted)]",
    badge:
      "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)]",
  },
} satisfies Record<
  Violation["impact"],
  {
    Icon: typeof Circle;
    icon: string;
    badge: string;
  }
>;

export default function ViolationCard({
  violation,
  showFix = false,
  onExplanationLoaded,
}: ViolationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [explanationLoading, setExplanationLoading] = useState(false);
  const { Icon, icon, badge } = impactStyles[violation.impact];
  const detailsId = `violation-details-${violation.id.replace(
    /[^a-zA-Z0-9_-]/g,
    "-"
  )}`;

  async function loadExplanation() {
    if (
      violation.fixableType === "not-fixable" ||
      explanation ||
      explanationLoading
    ) {
      return;
    }

    setExplanationLoading(true);
    try {
      const response = await fetch("/api/explain-violation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ violation }),
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof body === "object" &&
          body !== null &&
          !Array.isArray(body) &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Could not load the fix explanation";
        throw new Error(message);
      }

      if (
        typeof body !== "object" ||
        body === null ||
        Array.isArray(body) ||
        !("explanation" in body) ||
        typeof body.explanation !== "string"
      ) {
        throw new Error("Explanation service returned an invalid response");
      }

      setExplanation(body.explanation);
      onExplanationLoaded?.(violation.id, body.explanation);
      if (!body.explanation) {
        toast.error("AI explanation is unavailable. The accessibility scan results remain available.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load the fix explanation"
      );
    } finally {
      setExplanationLoading(false);
    }
  }

  function toggleExpanded() {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    if (nextExpanded && violation.fixableType !== "not-fixable") {
      void loadExplanation();
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] transition-[border-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-[var(--accent)]/35">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={toggleExpanded}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors duration-150 ease-out hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset"
      >
        <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${icon}`} />

        <span className="min-w-0 flex-1">
          <span className="mb-2 flex flex-wrap items-center gap-2">
            <span aria-hidden="true" className="flex items-center gap-0.5">
              <span className="h-1 w-2 rounded-sm bg-[var(--accent)]" />
              <span className="h-1 w-2 rounded-sm bg-[var(--accent)]/60" />
              <span className="h-1 w-2 rounded-sm bg-[var(--accent)]/30" />
            </span>
            <span className="inline-flex items-center rounded-md border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
              WCAG {violation.wcagCriterion}
            </span>
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold capitalize ${badge}`}
            >
              {violation.impact}
            </span>
            {showFix && (
              <span className="inline-flex items-center rounded-md border border-[var(--success)]/25 bg-[var(--success-surface)] px-2 py-0.5 text-xs font-semibold text-[var(--success)]">
                Resolved
              </span>
            )}
          </span>
          <span className="block text-sm font-semibold leading-snug text-[var(--foreground)]">
            {violation.help}
          </span>
          <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-[var(--foreground-muted)]">
            {violation.description}
          </span>
        </span>

        <ChevronDown
          aria-hidden="true"
          className={`mt-1 h-4 w-4 shrink-0 text-[var(--foreground-muted)] transition-transform duration-150 ease-out ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div
          id={detailsId}
          className="space-y-4 border-t border-[var(--border)] bg-[var(--surface-inset)] p-4"
        >
          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
              Affected element
            </h3>
            <pre className="max-w-full overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs leading-relaxed text-[var(--foreground)]">
              {violation.elementHtml}
            </pre>
          </section>

          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
              Selector
            </h3>
            <p className="break-all rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs leading-relaxed text-[var(--foreground)]">
              {violation.selector}
            </p>
          </section>

          {showFix && violation.fixableType !== "not-fixable" && (
            <span className="inline-flex items-center gap-1 rounded-md border border-[var(--success)]/25 bg-[var(--success-surface)] px-2 py-1 text-xs font-semibold text-[var(--success)]">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
              Auto-fixable
            </span>
          )}

          {violation.fixableType === "not-fixable" && (
            <span className="inline-flex items-center gap-1 rounded-md border border-[var(--warning)]/25 bg-[var(--warning-surface)] px-2 py-1 text-xs font-semibold text-[var(--warning)]">
              <Info aria-hidden="true" className="h-3.5 w-3.5" />
              Manual review needed
            </span>
          )}

          {violation.fixableType !== "not-fixable" && (
            <section aria-live="polite">
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
                AI fix explanation
              </h3>
              {explanationLoading ? (
                <div
                  className="space-y-2"
                  role="status"
                  aria-label="Generating explanation"
                >
                  <span className="block h-3 w-full animate-pulse rounded-sm bg-[var(--surface-raised)]" />
                  <span className="block h-3 w-4/5 animate-pulse rounded-sm bg-[var(--surface-raised)]" />
                  <span className="block h-3 w-3/5 animate-pulse rounded-sm bg-[var(--surface-raised)]" />
                </div>
              ) : explanation ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--foreground)]">
                  {explanation}
                </p>
              ) : (
                <p className="text-sm leading-relaxed text-[var(--foreground-muted)]">
                  AI explanation is unavailable. The accessibility scan results remain available; expand this card again to retry.
                </p>
              )}
            </section>
          )}

          <a
            href={violation.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-md text-xs font-semibold text-[var(--accent)] underline-offset-4 transition-colors duration-150 ease-out hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-inset)]"
          >
            Learn more at W3C →
          </a>
        </div>
      )}
    </div>
  );
}
