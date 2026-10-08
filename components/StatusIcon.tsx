import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import type { StageStatus } from "@/types";

interface StatusIconProps {
  status: StageStatus;
  size?: number;
}

const statusIcons = {
  pending: {
    Icon: Circle,
    className: "text-[var(--foreground-muted)]",
    traceClassName: "bg-[var(--foreground-subtle)]",
  },
  running: {
    Icon: Loader2,
    className: "text-[var(--accent)] motion-reduce:animate-none",
    traceClassName: "bg-[var(--accent)]",
  },
  done: {
    Icon: CheckCircle2,
    className: "text-[var(--success)]",
    traceClassName: "bg-[var(--success)]",
  },
  failed: {
    Icon: XCircle,
    className: "text-[var(--danger)]",
    traceClassName: "bg-[var(--danger)]",
  },
} satisfies Record<
  StageStatus,
  { Icon: typeof Circle; className: string; traceClassName: string }
>;

export default function StatusIcon({ status, size = 16 }: StatusIconProps) {
  const { Icon, className, traceClassName } = statusIcons[status];

  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon
        aria-hidden="true"
        className={className}
        width={size}
        height={size}
        strokeWidth={2}
      />
      <span aria-hidden="true" className="flex items-center gap-0.5">
        <span className={`h-1 w-1 rounded-sm ${traceClassName}`} />
        <span className={`h-1 w-1 rounded-sm ${traceClassName} opacity-60`} />
        <span className={`h-1 w-1 rounded-sm ${traceClassName} opacity-30`} />
      </span>
    </span>
  );
}
