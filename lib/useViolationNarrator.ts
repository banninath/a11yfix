"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeech } from "@/lib/useSpeech";
import type { Violation } from "@/types";

interface UseViolationNarratorArgs {
  violations: Violation[];
  score: number;
  explanations?: Record<string, string>;
}

const ruleNames: Record<string, string> = {
  "image-alt": "Missing image description",
  "button-name": "Unlabeled button",
  "link-name": "Unlabeled link",
  label: "Form field missing a label",
  "form-field-multiple-labels": "Form field with duplicate labels",
  "html-has-lang": "Page missing a language setting",
  "document-title": "Page missing a title",
  "color-contrast": "Low color contrast",
};

const impactNames: Record<Violation["impact"], string> = {
  critical: "critical issue",
  serious: "serious issue",
  moderate: "moderate issue",
  minor: "minor issue",
};

function normalizeSpeech(value: string): string {
  return value
    .replace(/\bhttps?:\/\/\S+/gi, "")
    .replace(/#[\da-f]{3,8}\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function humanizeRuleName(violation: Violation): string {
  if (violation.ruleId.startsWith("aria-")) {
    return "Invalid ARIA attribute";
  }
  return ruleNames[violation.ruleId] ?? violation.help;
}

function explanationSummary(explanation: string | undefined): string {
  if (!explanation?.trim()) {
    return "";
  }

  const summaryLine = explanation.match(
    /(?:what(?:'|’)s wrong|summary)\s*:\s*([^\n]+)/i
  )?.[1];
  return normalizeSpeech(summaryLine ?? "");
}

function buildQueue(
  violations: Violation[],
  score: number,
  explanations: Record<string, string>
): string[] {
  const fixableCount = violations.filter(
    (violation) => violation.fixableType !== "not-fixable"
  ).length;
  const queue = [
    violations.length === 0
      ? "No violations found. Score 100 out of 100."
      : `Found ${violations.length} violations. Score ${score} out of 100. ${fixableCount} are automatically fixable.`,
  ];

  for (const violation of violations) {
    const help = normalizeSpeech(violation.help);
    if (!help) {
      continue;
    }

    const name = normalizeSpeech(humanizeRuleName(violation));
    if (!name) {
      continue;
    }

    const parts = [
      `${name}, ${impactNames[violation.impact]}.`,
      `${help.replace(/[.!?]+$/, "")}.`,
    ];
    const summary = explanationSummary(explanations[violation.id]);
    if (summary) {
      parts.push(`${summary.replace(/[.!?]+$/, "")}.`);
    }
    queue.push(parts.join(" "));
  }

  return queue.flatMap((line, index) =>
    index === queue.length - 1 ? [line] : [line, " "]
  );
}

export function useViolationNarrator({
  violations,
  score,
  explanations = {},
}: UseViolationNarratorArgs) {
  const { speak, stop: stopSpeech, isSupported } = useSpeech();
  const [isNarrating, setIsNarrating] = useState(false);
  const generationRef = useRef(0);
  const playLineRef = useRef<(index: number, generation: number) => void>(
    () => {}
  );
  const queueRef = useRef<string[]>([]);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputsRef = useRef({ violations, score, explanations });

  useEffect(() => {
    inputsRef.current = { violations, score, explanations };
  }, [violations, score, explanations]);

  const playLine = useCallback((index: number, generation: number) => {
    if (generation !== generationRef.current) {
      return;
    }

    const line = queueRef.current[index];
    if (line === undefined) {
      setIsNarrating(false);
      return;
    }

    if (!line.trim()) {
      pauseTimerRef.current = setTimeout(() => {
        pauseTimerRef.current = null;
        playLineRef.current(index + 1, generation);
      }, 220);
      return;
    }

    speak(line, () => {
      if (generation === generationRef.current) {
        playLineRef.current(index + 1, generation);
      }
    });
  }, [speak]);

  useEffect(() => {
    playLineRef.current = playLine;
  }, [playLine]);

  const stop = useCallback(() => {
    generationRef.current += 1;
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    stopSpeech();
    setIsNarrating(false);
  }, [stopSpeech]);

  const start = useCallback(() => {
    if (!isSupported) {
      return;
    }

    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    const current = inputsRef.current;
    queueRef.current = buildQueue(
      current.violations,
      current.score,
      current.explanations
    );
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    setIsNarrating(true);
    playLineRef.current(0, generation);
  }, [isSupported]);

  useEffect(
    () => () => {
      generationRef.current += 1;
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
    },
    []
  );

  return { isSupported, isNarrating, start, stop };
}
