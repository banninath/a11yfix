"use client";

import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";

interface ScoreGaugeProps {
  score: number;
  label?: string;
  size?: number;
}

function colorForScore(score: number): string {
  if (score >= 90) {
    return "var(--success)";
  }
  if (score >= 70) {
    return "var(--accent)";
  }
  if (score >= 50) {
    return "var(--warning)";
  }
  return "var(--danger)";
}

export default function ScoreGauge({
  score,
  label = "Score",
  size = 140,
}: ScoreGaugeProps) {
  const normalizedScore = Number.isFinite(score)
    ? Math.min(100, Math.max(0, score))
    : 0;
  const color = colorForScore(normalizedScore);
  const data = [{ name: label, value: normalizedScore, fill: color }];

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${normalizedScore} out of 100`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={data}
          innerRadius="76%"
          outerRadius="93%"
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            background
            dataKey="value"
            cornerRadius={12}
            isAnimationActive={false}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-semibold tracking-tight text-[var(--foreground)] tabular-nums">
            {normalizedScore}
          </span>
          <span className="text-xs font-medium text-[var(--foreground-muted)]">
            /100
          </span>
        </div>
        <span className="mt-1 text-xs font-medium text-[var(--foreground-muted)]">
          {label}
        </span>
        <span aria-hidden="true" className="mt-2 flex items-center gap-1">
          <span className="h-1 w-3 rounded-sm bg-[var(--accent)]" />
          <span className="h-1 w-3 rounded-sm bg-[var(--audit-trace-muted)]" />
          <span className="h-1 w-3 rounded-sm bg-[var(--audit-trace-muted)]" />
        </span>
      </div>
    </div>
  );
}
