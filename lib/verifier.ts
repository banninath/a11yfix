import { scanHtml } from "@/lib/scanner";
import type { VerifyResult, Violation } from "@/types";

function signature(violation: Violation): string {
  return `${violation.ruleId}::${violation.selector}`;
}

export async function verifyFixes(
  fixedHtml: string,
  originalViolations: Violation[]
): Promise<VerifyResult> {
  const after = await scanHtml(fixedHtml);
  const originalSignatures = new Set(originalViolations.map(signature));
  const remaining = after.violations.filter((violation) =>
    originalSignatures.has(signature(violation))
  );
  const regressions = after.violations.filter(
    (violation) => !originalSignatures.has(signature(violation))
  );
  const remainingSignatures = new Set(remaining.map(signature));

  return {
    resolved: originalViolations.filter(
      (violation) => !remainingSignatures.has(signature(violation))
    ).length,
    remaining,
    regressions,
  };
}
