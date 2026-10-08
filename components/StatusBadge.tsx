import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
} from "lucide-react";

export type StatusBadgeStatus =
  | "verified"
  | "partial"
  | "failed"
  | "running"
  | "pending";

interface StatusBadgeProps {
  status: StatusBadgeStatus;
}

const statusStyles: Record<
  StatusBadgeStatus,
  {
    className: string;
    label: string;
    Icon: typeof Circle;
    traceClassName: string;
    iconClassName?: string;
  }
> = {
  verified: {
    className:
      "border-[var(--success)]/25 bg-[var(--success-surface)] text-[var(--success)]",
    label: "Verified",
    Icon: CheckCircle2,
    traceClassName: "bg-[var(--success)]",
  },
  partial: {
    className:
      "border-[var(--warning)]/25 bg-[var(--warning-surface)] text-[var(--warning)]",
    label: "Partial",
    Icon: AlertCircle,
    traceClassName: "bg-[var(--warning)]",
  },
  failed: {
    className:
      "border-[var(--danger)]/25 bg-[var(--danger-surface)] text-[var(--danger)]",
    label: "Failed",
    Icon: XCircle,
    traceClassName: "bg-[var(--danger)]",
  },
  running: {
    className:
      "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]",
    label: "Running",
    Icon: Loader2,
    traceClassName: "bg-[var(--accent)]",
    iconClassName: "motion-reduce:animate-none",
  },
  pending: {
    className:
      "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground-muted)]",
    label: "Pending",
    Icon: Circle,
    traceClassName: "bg-[var(--foreground-subtle)]",
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { className, label, Icon, traceClassName, iconClassName } =
    statusStyles[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold leading-none ${className}`}
    >
      <Icon
        aria-hidden="true"
        className={`h-4 w-4 ${status === "running" ? "animate-spin" : ""} ${iconClassName ?? ""}`}
      />
      {label}
      <span aria-hidden="true" className="flex items-center gap-0.5">
        <span className={`h-1 w-1 rounded-sm ${traceClassName}`} />
        <span className={`h-1 w-1 rounded-sm ${traceClassName} opacity-60`} />
        <span className={`h-1 w-1 rounded-sm ${traceClassName} opacity-30`} />
      </span>
    </span>
  );
}
