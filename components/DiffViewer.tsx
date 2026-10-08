"use client";

import { useMemo } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

interface DiffViewerProps {
  before: string;
  after: string;
}

type DiffKind = "added" | "removed" | "unchanged";

interface DiffLine {
  kind: DiffKind;
  text: string;
}

const MAX_LCS_CELLS = 300_000;

function buildDiff(before: string, after: string): DiffLine[] {
  const oldLines = before.split(/\r?\n/);
  const newLines = after.split(/\r?\n/);
  const columns = newLines.length + 1;
  const cellCount = (oldLines.length + 1) * columns;

  if (cellCount > MAX_LCS_CELLS) {
    return [
      ...oldLines.map((text) => ({ kind: "removed" as const, text })),
      ...newLines.map((text) => ({ kind: "added" as const, text })),
    ];
  }

  const lengths = new Uint32Array(cellCount);
  for (let oldIndex = oldLines.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newLines.length - 1; newIndex >= 0; newIndex -= 1) {
      const cell = oldIndex * columns + newIndex;
      if (oldLines[oldIndex] === newLines[newIndex]) {
        lengths[cell] = lengths[cell + columns + 1] + 1;
      } else {
        lengths[cell] = Math.max(
          lengths[cell + columns],
          lengths[cell + 1]
        );
      }
    }
  }

  const diff: DiffLine[] = [];
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < oldLines.length && newIndex < newLines.length) {
    const oldLine = oldLines[oldIndex];
    const newLine = newLines[newIndex];
    if (oldLine === newLine) {
      diff.push({ kind: "unchanged", text: oldLine });
      oldIndex += 1;
      newIndex += 1;
    } else if (
      lengths[oldIndex * columns + newIndex + 1] >=
      lengths[(oldIndex + 1) * columns + newIndex]
    ) {
      diff.push({ kind: "added", text: newLine });
      newIndex += 1;
    } else {
      diff.push({ kind: "removed", text: oldLine });
      oldIndex += 1;
    }
  }

  while (oldIndex < oldLines.length) {
    diff.push({ kind: "removed", text: oldLines[oldIndex] });
    oldIndex += 1;
  }
  while (newIndex < newLines.length) {
    diff.push({ kind: "added", text: newLines[newIndex] });
    newIndex += 1;
  }

  return diff;
}

const lineClasses: Record<DiffKind, string> = {
  added:
    "block min-w-max bg-[var(--success-surface)] before:mr-3 before:font-bold before:text-[var(--success)] before:content-['+']",
  removed:
    "block min-w-max bg-[var(--danger-surface)] before:mr-3 before:font-bold before:text-[var(--danger)] before:content-['-']",
  unchanged:
    "block min-w-max before:mr-3 before:text-[var(--foreground-subtle)] before:content-[' ']",
};

export default function DiffViewer({ before, after }: DiffViewerProps) {
  const diff = useMemo(() => buildDiff(before, after), [before, after]);
  const highlightedCode = diff.map((line) => line.text).join("\n");

  return (
    <section
      aria-label="HTML changes"
      className="mt-8 space-y-4 border-t border-[var(--border)] pt-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]">
            HTML diff
          </h3>
          <div className="mt-2 flex items-center gap-1.5" aria-hidden="true">
            <span className="h-1 w-3 rounded-sm bg-[var(--accent)]" />
            <span className="h-1 w-3 rounded-sm bg-[var(--accent)]/60" />
            <span className="h-1 w-3 rounded-sm bg-[var(--accent)]/30" />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[var(--foreground-muted)]">
            <span className="font-semibold text-[var(--danger)]">
              Removed
            </span>{" "}
            and{" "}
            <span className="font-semibold text-[var(--success)]">
              added
            </span>{" "}
            lines show changes; unchanged lines provide context.
          </p>
        </div>
        <span className="rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] px-3 py-2 text-xs font-medium text-[var(--foreground-muted)] tabular-nums">
          {diff.filter((line) => line.kind === "added").length} added ·{" "}
          {diff.filter((line) => line.kind === "removed").length} removed
        </span>
      </div>
      <div className="max-h-[34rem] overflow-auto rounded-xl border border-[var(--border-strong)] bg-[var(--surface-inset)] p-3 font-mono text-xs leading-6 text-[var(--foreground)] sm:p-4">
        <SyntaxHighlighter
          language="markup"
          PreTag="div"
          useInlineStyles={false}
          showLineNumbers
          lineProps={(lineNumber: number) => ({
            className: lineClasses[diff[lineNumber - 1]?.kind ?? "unchanged"],
          })}
          className="!m-0 !bg-transparent !p-0"
        >
          {highlightedCode}
        </SyntaxHighlighter>
      </div>
    </section>
  );
}
