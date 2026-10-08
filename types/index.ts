export type ImpactLevel = "minor" | "moderate" | "serious" | "critical";

export type FixableType =
  | "missing-alt"
  | "missing-label"
  | "unlabeled-button"
  | "missing-lang"
  | "missing-title"
  | "not-fixable";

export type CertificateStatus = "verified" | "partial" | "failed";

export type StageStatus = "pending" | "running" | "done" | "failed";
export type AuditStatus = "pass" | "warn" | "fail";

export type AuditCategory =
  | "metadata"
  | "language"
  | "sharing"
  | "structure"
  | "links"
  | "performance";

export interface AuditCheck {
  id: string;
  category: AuditCategory;
  label: string;
  status: AuditStatus;
  message: string;
  value?: string;
  suggestion?: string;
}

export interface SiteAudit {
  url: string;
  checkedAt: string;
  checks: AuditCheck[];
  passedCount: number;
  warnCount: number;
  failCount: number;
  score: number;
}

export interface Violation {
  id: string;
  ruleId: string;
  wcagCriterion: string;
  description: string;
  help: string;
  helpUrl: string;
  impact: ImpactLevel;
  elementHtml: string;
  selector: string;
  fixableType: FixableType;
  pageUrl?: string;
  wcagCriteria?: string[];
  wcagLevel?: "A" | "AA" | "AAA" | null;
  failureSummary?: string;
}

export type AxeRuleStatus = "passed" | "failed" | "incomplete";

export interface AxeRuleNode {
  selector: string;
  html: string;
  failureSummary?: string;
  fixableType?: FixableType;
}

export interface AxeRuleResult {
  id: string;
  status: AxeRuleStatus;
  impact: ImpactLevel | null;
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  wcagCriteria: string[];
  wcagLevel: "A" | "AA" | "AAA" | null;
  pageUrl: string;
  nodes: AxeRuleNode[];
}

export interface WebsiteMetadata {
  title: string;
  description: string;
  canonical: string;
  language: string;
  direction: string;
  charset: string;
  viewport: string;
  robots: string;
  favicon: string;
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
  structuredData: Array<{ types: string[]; summary: string }>;
}

export interface PageStructure {
  headings: Record<string, number>;
  headingOrder: string[];
  landmarks: Record<string, number>;
  images: number;
  links: number;
  buttons: number;
  forms: number;
  tables: number;
  iframes: number;
  inputs: number;
  dialogs: number;
}

export interface DiscoveredLink {
  sourcePage: string;
  destinationUrl: string;
  anchorText: string;
  isInternal: boolean;
  isEmpty: boolean;
  crawlStatus: "crawled" | "failed" | "not-crawled" | "external";
  httpStatus?: number;
}

export interface Fix {
  violationId: string;
  fixableType: FixableType;
  selector: string;
  before: string;
  after: string;
  note: string;
}

export interface VerifyResult {
  resolved: number;
  remaining: Violation[];
  regressions: Violation[];
}

export interface Certificate {
  id: string;
  createdAt: string;
  inputHash: string;
  inputSnippet: string;
  violationsBefore: Violation[];
  violationsAfter: Violation[];
  fixesApplied: Fix[];
  regressions: Violation[];
  status: CertificateStatus;
  summary: string;
  beforeScore: number;
  afterScore: number;
}

export interface ScanRequest {
  html?: string;
  url?: string;
  includeHtmlSnapshot?: boolean;
}

export interface ScanResponse {
  violations: Violation[];
  rules: AxeRuleResult[];
  passedChecks: number;
  incompleteChecks: number;
  score: number;
  scannedAt: string;
  audit?: SiteAudit;
  finalUrl?: string;
  httpStatus?: number;
  htmlSnapshot?: string;
}

export interface FixResponse {
  fixedHtml: string;
  fixes: Fix[];
}

export interface VerifyRequest {
  originalHtml: string;
  fixedHtml: string;
  originalViolations: Violation[];
  fixes: Fix[];
}

export interface CertifyRequest {
  inputHtml: string;
  fixedHtml?: string;
  before: Violation[];
  after: Violation[];
  fixes: Fix[];
  verify: VerifyResult;
}

export function isViolation(value: unknown): value is Violation {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.ruleId === "string" &&
    typeof record.wcagCriterion === "string" &&
    typeof record.description === "string" &&
    typeof record.help === "string" &&
    typeof record.helpUrl === "string" &&
    (record.impact === "minor" ||
      record.impact === "moderate" ||
      record.impact === "serious" ||
      record.impact === "critical") &&
    typeof record.elementHtml === "string" &&
    typeof record.selector === "string" &&
    (record.fixableType === "missing-alt" ||
      record.fixableType === "missing-label" ||
      record.fixableType === "unlabeled-button" ||
      record.fixableType === "missing-lang" ||
      record.fixableType === "missing-title" ||
      record.fixableType === "not-fixable")
  );
}

export function isFix(value: unknown): value is Fix {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.violationId === "string" &&
    (record.fixableType === "missing-alt" ||
      record.fixableType === "missing-label" ||
      record.fixableType === "unlabeled-button" ||
      record.fixableType === "missing-lang" ||
      record.fixableType === "missing-title" ||
      record.fixableType === "not-fixable") &&
    typeof record.selector === "string" &&
    typeof record.before === "string" &&
    typeof record.after === "string" &&
    typeof record.note === "string"
  );
}

export function isVerifyResult(value: unknown): value is VerifyResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.resolved === "number" &&
    Number.isInteger(record.resolved) &&
    record.resolved >= 0 &&
    Array.isArray(record.remaining) &&
    record.remaining.every(isViolation) &&
    Array.isArray(record.regressions) &&
    record.regressions.every(isViolation)
  );
}
