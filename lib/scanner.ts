import { AxeBuilder } from "@axe-core/playwright";
import { chromium } from "playwright";
import { validatePublicHttpUrl } from "@/lib/urlSecurity";
import type {
  AxeRuleNode,
  AxeRuleResult,
  ImpactLevel,
  ScanResponse,
  SiteAudit,
  Violation,
} from "@/types";

type AxeResults = Awaited<ReturnType<AxeBuilder["analyze"]>>;
type AxeViolation = AxeResults["violations"][number];

const impactWeights: Record<ImpactLevel, number> = {
  critical: 10,
  serious: 6,
  moderate: 3,
  minor: 1,
};

function classifyFixable(
  ruleId: string,
  elementHtml: string,
  hasOgTitle: boolean,
): Violation["fixableType"] {
  if (
    ruleId === "image-alt" &&
    /\baria-label\s*=\s*(?:"[^"\s][^"]*"|'[^'\s][^']*'|[^\s>]+)/i.test(elementHtml)
  ) {
    return "missing-alt";
  }
  if (ruleId === "document-title" && hasOgTitle) {
    return "missing-title";
  }
  return "not-fixable";
}

function toImpact(value: string | null | undefined): ImpactLevel {
  if (
    value === "critical" ||
    value === "serious" ||
    value === "moderate" ||
    value === "minor"
  ) {
    return value;
  }
  return "moderate";
}

function toWcagCriterion(tags: string[]): string {
  const tag = tags.find((candidate) => /^wcag\d{3,4}$/.test(candidate));
  const match = tag?.match(/^wcag(\d)(\d)(\d{1,2})$/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : "N/A";
}

function toWcagCriteria(tags: string[]): string[] {
  return [...new Set(tags.flatMap((tag) => {
    const match = tag.match(/^wcag(\d)(\d)(\d{1,2})$/);
    return match ? [`${match[1]}.${match[2]}.${match[3]}`] : [];
  }))];
}

function toWcagLevel(tags: string[]): AxeRuleResult["wcagLevel"] {
  if (tags.some((tag) => /^wcag\d+aaa$/.test(tag))) return "AAA";
  if (tags.some((tag) => /^wcag\d+aa$/.test(tag))) return "AA";
  if (tags.some((tag) => /^wcag\d+a$/.test(tag))) return "A";
  return null;
}

function selectorForTarget(target: AxeViolation["nodes"][number]["target"]): string {
  return target
    .map((selector) =>
      typeof selector === "string" ? selector : selector.join(" ")
    )
    .join(", ");
}

function mapAxeViolations(
  axeViolations: AxeResults["violations"],
  hasOgTitle: boolean,
): Violation[] {
  const violations: Violation[] = [];

  for (const violation of axeViolations) {
    for (const node of violation.nodes) {
      const selector = selectorForTarget(node.target);
      violations.push({
        id: `${violation.id}:${selector}`,
        ruleId: violation.id,
        wcagCriterion: toWcagCriterion(violation.tags),
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        impact: toImpact(node.impact ?? violation.impact),
        elementHtml: node.html,
        selector,
        fixableType: classifyFixable(violation.id, node.html, hasOgTitle),
        pageUrl: "",
        wcagCriteria: toWcagCriteria(violation.tags),
        wcagLevel: toWcagLevel(violation.tags),
        failureSummary: node.failureSummary ?? undefined,
      });
    }
  }

  return violations;
}

function selectorForRuleTarget(
  target: AxeResults["violations"][number]["nodes"][number]["target"],
): string {
  return target
    .map((selector) =>
      typeof selector === "string" ? selector : selector.join(" "),
    )
    .join(", ");
}

function mapRule(
  rule: AxeResults["violations"][number],
  status: AxeRuleResult["status"],
  pageUrl: string,
  hasOgTitle: boolean,
): AxeRuleResult {
  const nodes: AxeRuleNode[] = rule.nodes.map((node) => ({
    selector: selectorForRuleTarget(node.target),
    html: node.html,
    failureSummary: node.failureSummary ?? undefined,
    fixableType: status === "failed"
      ? classifyFixable(rule.id, node.html, hasOgTitle)
      : "not-fixable",
  }));
  return {
    id: rule.id,
    status,
    impact: rule.impact ? toImpact(rule.impact) : null,
    description: rule.description,
    help: rule.help,
    helpUrl: rule.helpUrl,
    tags: rule.tags,
    wcagCriteria: toWcagCriteria(rule.tags),
    wcagLevel: toWcagLevel(rule.tags),
    pageUrl,
    nodes,
  };
}

function mapAxeRules(
  results: AxeResults,
  pageUrl: string,
  hasOgTitle: boolean,
): AxeRuleResult[] {
  return [
    ...results.passes.map((rule) => mapRule(rule, "passed", pageUrl, hasOgTitle)),
    ...results.violations.map((rule) => mapRule(rule, "failed", pageUrl, hasOgTitle)),
    ...results.incomplete.map((rule) => mapRule(rule, "incomplete", pageUrl, hasOgTitle)),
  ];
}

export function buildAxeAuditSummary(
  url: string,
  result: Pick<
    ScanResponse,
    "violations" | "rules" | "passedChecks" | "incompleteChecks" | "scannedAt" | "score"
  >,
): SiteAudit {
  const passedCount = result.rules.filter((rule) => rule.status === "passed").length;
  const failCount = result.rules.filter((rule) => rule.status === "failed").length;
  const warnCount = result.rules.filter((rule) => rule.status === "incomplete").length;
  const checks: SiteAudit["checks"] = [];

  if (passedCount > 0) {
    checks.push({
      id: "wcag-passed",
      category: "structure",
      label: "Passed / correct WCAG checks",
      status: "pass",
      message: `${passedCount} axe-core rules passed. Automated scans cover approximately 57% of WCAG criteria; some checks still require manual review.`,
    });
  }
  if (failCount > 0) {
    checks.push({
      id: "wcag-failed",
      category: "links",
      label: "Failed / incorrect WCAG checks",
      status: "fail",
      message: `${failCount} axe-core rules reported violations. Review the affected elements and evidence.`,
    });
  }
  if (warnCount > 0) {
    checks.push({
      id: "wcag-incomplete",
      category: "performance",
      label: "Incomplete / manual review",
      status: "warn",
      message: `${warnCount} axe-core rules need manual review; incomplete results are not passes or violations.`,
    });
  }

  return {
    url,
    checkedAt: result.scannedAt,
    passedCount,
    warnCount,
    failCount,
    score: Number.isFinite(result.score)
      ? Math.max(0, Math.min(100, Math.round(result.score)))
      : 0,
    checks,
  };
}

async function scanWithPage(
  htmlOrUrl: string,
  isUrl: boolean,
  includeHtmlSnapshot = false,
): Promise<ScanResponse> {
  if (isUrl) {
    await validatePublicHttpUrl(htmlOrUrl);
  }
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route("**/*", async (route) => {
      const requestUrl = route.request().url();
      if (/^(data|blob):/i.test(requestUrl)) {
        await route.continue();
        return;
      }
      try {
        await validatePublicHttpUrl(requestUrl);
        await route.continue();
      } catch {
        await route.abort("blockedbyclient");
      }
    });

    let navigationResponse;
    if (isUrl) {
      navigationResponse = await page.goto(htmlOrUrl, {
        waitUntil: "domcontentloaded",
        timeout: 20_000,
      });
    } else {
      await page.setContent(htmlOrUrl, {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      });
    }

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const pageUrl = isUrl ? page.url() : "HTML input";
    const ogTitle = await page.locator('meta[property="og:title" i]').getAttribute("content").catch(() => null);
    const hasOgTitle = Boolean(ogTitle?.trim());
    const violations = mapAxeViolations(results.violations, hasOgTitle);
    for (const violation of violations) violation.pageUrl = pageUrl;
    const rules = mapAxeRules(results, pageUrl, hasOgTitle);
    const passedChecks = results.passes.length;
    const incompleteChecks = results.incomplete.length;
    const penalty = violations.reduce(
      (total, violation) => total + impactWeights[violation.impact],
      0
    );
    const score = Math.max(0, 100 - penalty);
    const scannedAt = new Date().toISOString();
    const htmlSnapshot = includeHtmlSnapshot ? await page.content() : undefined;
    if (htmlSnapshot && Buffer.byteLength(htmlSnapshot, "utf8") > 2 * 1024 * 1024) {
      throw new RangeError("Rendered page snapshot exceeds the 2 MB repair-preview limit");
    }

    return {
      violations,
      rules,
      passedChecks,
      incompleteChecks,
      score,
      scannedAt,
      ...(isUrl ? { finalUrl: page.url(), httpStatus: navigationResponse?.status() ?? 0 } : {}),
      ...(htmlSnapshot === undefined ? {} : { htmlSnapshot }),
      audit: buildAxeAuditSummary(htmlOrUrl, {
        violations,
        rules,
        passedChecks,
        incompleteChecks,
        score,
        scannedAt,
      }),
    };
  } finally {
    await browser.close();
  }
}

export async function scanHtml(html: string): Promise<ScanResponse> {
  if (!html.trim()) {
    const scannedAt = new Date().toISOString();
    return {
      violations: [],
      rules: [],
      passedChecks: 0,
      incompleteChecks: 0,
      score: 0,
      scannedAt,
      audit: buildAxeAuditSummary("HTML input", {
        violations: [],
        rules: [],
        passedChecks: 0,
        incompleteChecks: 0,
        score: 0,
        scannedAt,
      }),
    };
  }
  return scanWithPage(html, false);
}

export async function scanUrl(
  url: string,
  options: { includeHtmlSnapshot?: boolean } = {},
): Promise<ScanResponse> {
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("URL must use the http or https protocol");
  }
  return scanWithPage(parsedUrl.toString(), true, options.includeHtmlSnapshot);
}
