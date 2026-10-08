import { createHash, randomUUID } from "node:crypto";
import type {
  Certificate,
  CertificateStatus,
  Fix,
  ImpactLevel,
  VerifyResult,
  Violation,
} from "@/types";

const impactWeights: Record<ImpactLevel, number> = {
  critical: 10,
  serious: 6,
  moderate: 3,
  minor: 1,
};

export function scoreFromViolations(violations: Violation[]): number {
  const penalty = violations.reduce(
    (total, violation) => total + impactWeights[violation.impact],
    0
  );
  return Math.max(0, 100 - penalty);
}

function determineStatus(
  verify: VerifyResult,
  after: Violation[],
  fixes: Fix[],
): CertificateStatus {
  if (verify.regressions.length > 0) {
    return "failed";
  }
  if (fixes.length === 0) {
    return "partial";
  }
  return after.length === 0 ? "verified" : "partial";
}

function generateSummary(
  before: Violation[],
  after: Violation[],
  verify: VerifyResult,
  fixes: Fix[],
): string {
  if (verify.regressions.length > 0) {
    return `Verification found ${verify.regressions.length} regression(s).`;
  }
  if (fixes.length === 0 && before.length === 0) {
    return "No automated violations were found. No repairs were applied; manual review remains necessary.";
  }
  if (fixes.length === 0) {
    return `No safe automatic repairs were applied. ${after.length} violation(s) remain for review.`;
  }
  if (after.length === 0) {
    return `All ${before.length} violation(s) resolved. No regressions.`;
  }
  return `${verify.resolved} of ${before.length} resolved. ${after.length} violation(s) remain.`;
}

export function buildCertificate(
  inputHtml: string,
  before: Violation[],
  after: Violation[],
  fixes: Fix[],
  verify: VerifyResult
): Certificate {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    inputHash: createHash("sha256").update(inputHtml).digest("hex"),
    inputSnippet: inputHtml.slice(0, 200),
    violationsBefore: before,
    violationsAfter: after,
    fixesApplied: fixes,
    regressions: verify.regressions,
    status: determineStatus(verify, after, fixes),
    summary: generateSummary(before, after, verify, fixes),
    beforeScore: scoreFromViolations(before),
    afterScore: scoreFromViolations(after),
  };
}
