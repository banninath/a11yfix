"use client";

import StatusIcon from "@/components/StatusIcon";

export type PipelineStageKey = "scan" | "fix" | "verify" | "certify";

export interface PipelineStage {
  key: PipelineStageKey;
  label: string;
  status: "pending" | "running" | "done" | "failed";
  message?: string;
}

interface ProgressStepperProps {
  stages?: PipelineStage[];
}

const statusStyles: Record<PipelineStage["status"], string> = {
  pending:
    "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)]",
  running:
    "border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)]",
  done:
    "border-[var(--success)]/35 bg-[var(--success-surface)] text-[var(--success)]",
  failed:
    "border-[var(--danger)]/35 bg-[var(--danger-surface)] text-[var(--danger)]",
};

export default function ProgressStepper({ stages }: ProgressStepperProps) {
  if (!stages?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6">
      <ol className="flex items-start justify-between gap-1 sm:gap-2">
        {stages.map((stage, index) => {
          const nextStage = stages[index + 1];
          const connectorComplete = nextStage?.status === "done";

          return (
            <li
              key={stage.key}
              className="relative flex min-w-0 flex-1 flex-col items-center text-center"
            >
              <div
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-lg border transition-[background-color,border-color,color,transform] duration-150 ease-out ${statusStyles[stage.status]}`}
              >
                <StatusIcon status={stage.status} size={18} />
              </div>
              <span className="mt-3 max-w-full break-words text-xs font-semibold tracking-tight text-[var(--foreground)] sm:text-sm">
                {stage.label}
              </span>
              {stage.message && (
                <span className="mt-1 max-w-40 text-xs leading-relaxed text-[var(--foreground-muted)]">
                  {stage.message}
                </span>
              )}
              {nextStage && (
                <div
                  aria-hidden="true"
                  className="absolute left-1/2 right-[-50%] top-5 flex h-px gap-1"
                >
                  <span
                    className={`h-px flex-1 ${
                      connectorComplete
                        ? "bg-[var(--success)]"
                        : "bg-[var(--border)]"
                    }`}
                  />
                  <span className="h-px w-2 bg-[var(--audit-trace-muted)]" />
                  <span className="h-px w-2 bg-[var(--audit-trace-muted)]" />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
