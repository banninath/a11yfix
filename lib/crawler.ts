import "server-only";

import { AxeBuilder } from "@axe-core/playwright";
import { chromium } from "playwright";
import { validatePublicHttpUrl } from "@/lib/urlSecurity";
import type { Browser, Page } from "playwright";
import type {
  AxeRuleNode,
  AxeRuleResult,
  DiscoveredLink,
  ImpactLevel,
  PageStructure,
  Violation,
  WebsiteMetadata,
} from "@/types";

export interface CrawledPage {
  url: string;
  title: string;
  httpStatus: number;
  loadTimeMs: number;
  metadata: WebsiteMetadata;
  structure: PageStructure;
  violations: Violation[];
  rules: AxeRuleResult[];
  links: DiscoveredLink[];
  passedChecks: number;
  incompleteChecks: number;
  score: number;
}

export interface FailedCrawlPage {
  url: string;
  error: string;
  timedOut: boolean;
}

export type CrawlStatus = "complete" | "partial" | "failed";

export interface CrawlResult {
  startingUrl: string;
  status: CrawlStatus;
  scannedAt: string;
  durationMs: number;
  pageLimit: number;
  discoveredPagesCount: number;
  limitReached: boolean;
  pages: CrawledPage[];
  failedPages: FailedCrawlPage[];
  links: DiscoveredLink[];
  metadata: WebsiteMetadata | null;
  totalViolations: number;
  totalPassedRules: number;
  totalIncompleteChecks: number;
  pagesWithViolations: number;
  averageScore: number;
}

type AxeResults = Awaited<ReturnType<AxeBuilder["analyze"]>>;
type AxeViolation = AxeResults["violations"][number];

const MAX_PAGES = 100;
const DEFAULT_MAX_PAGES = MAX_PAGES;
const NAVIGATION_TIMEOUT_MS = 20_000;

const impactWeights: Record<ImpactLevel, number> = {
  critical: 10,
  serious: 6,
  moderate: 3,
  minor: 1,
};

function emptyResult(startingUrl = "", pageLimit = DEFAULT_MAX_PAGES): CrawlResult {
  return {
    startingUrl,
    status: "failed",
    scannedAt: new Date().toISOString(),
    durationMs: 0,
    pageLimit,
    discoveredPagesCount: 0,
    limitReached: false,
    pages: [],
    failedPages: [],
    links: [],
    metadata: null,
    totalViolations: 0,
    totalPassedRules: 0,
    totalIncompleteChecks: 0,
    pagesWithViolations: 0,
    averageScore: 0,
  };
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

function selectorForTarget(
  target: AxeViolation["nodes"][number]["target"]
): string {
  return target
    .map((selector) =>
      typeof selector === "string" ? selector : selector.join(" ")
    )
    .join(", ");
}

function mapRuleNodes(
  ruleId: string,
  nodes: AxeViolation["nodes"],
  status: AxeRuleResult["status"],
  hasOgTitle: boolean,
): AxeRuleNode[] {
  return nodes.map((node) => ({
    selector: selectorForTarget(node.target),
    html: node.html,
    failureSummary: node.failureSummary ?? undefined,
    fixableType: status === "failed"
      ? classifyFixable(ruleId, node.html, hasOgTitle)
      : "not-fixable",
  }));
}

function mapRule(
  rule: AxeResults["violations"][number],
  status: AxeRuleResult["status"],
  pageUrl: string,
  hasOgTitle: boolean,
): AxeRuleResult {
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
    nodes: mapRuleNodes(rule.id, rule.nodes, status, hasOgTitle),
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

function mapViolations(
  axeViolations: AxeResults["violations"],
  pageUrl: string,
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
        pageUrl,
        wcagCriteria: toWcagCriteria(violation.tags),
        wcagLevel: toWcagLevel(violation.tags),
        failureSummary: node.failureSummary ?? undefined,
      });
    }
  }
  return violations;
}

async function scanPage(page: Page): Promise<AxeResults> {
  return new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
}

async function extractPageData(
  page: Page,
  startUrl: URL,
): Promise<{ metadata: WebsiteMetadata; structure: PageStructure; links: DiscoveredLink[] }> {
  return page.evaluate((origin) => {
    const meta = (name: string, attribute = "name") =>
      document.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`)?.content ?? "";
    const metadata: WebsiteMetadata = {
      title: document.title,
      description: meta("description"),
      canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? "",
      language: document.documentElement.lang,
      direction: document.documentElement.dir,
      charset: document.characterSet,
      viewport: meta("viewport"),
      robots: meta("robots"),
      favicon: document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href ?? "",
      openGraph: {},
      twitter: {},
      structuredData: [],
    };

    document.querySelectorAll<HTMLMetaElement>("meta[property^='og:']").forEach((item) => {
      if (item.content) metadata.openGraph[item.getAttribute("property") ?? ""] = item.content;
    });
    document.querySelectorAll<HTMLMetaElement>("meta[name^='twitter:']").forEach((item) => {
      if (item.content) metadata.twitter[item.name] = item.content;
    });
    document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]').forEach((script) => {
      try {
        const parsed: unknown = JSON.parse(script.textContent ?? "");
        const items = Array.isArray(parsed) ? parsed : [parsed];
        const types = items.flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const type = (item as { "@type"?: unknown })["@type"];
          return typeof type === "string" ? [type] : Array.isArray(type) ? type.filter((value): value is string => typeof value === "string") : [];
        });
        metadata.structuredData.push({ types, summary: types.join(", ") || "JSON-LD block detected" });
      } catch {
        metadata.structuredData.push({ types: [], summary: "Unparseable JSON-LD block detected" });
      }
    });

    const headings = Object.fromEntries(Array.from({ length: 6 }, (_, index) => {
      const name = `h${index + 1}`;
      return [name, document.querySelectorAll(name).length];
    }));
    const structure: PageStructure = {
      headings,
      headingOrder: Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"), (heading) => heading.tagName.toLowerCase()),
      landmarks: {
        header: document.querySelectorAll("header,[role='banner']").length,
        nav: document.querySelectorAll("nav,[role='navigation']").length,
        main: document.querySelectorAll("main,[role='main']").length,
        footer: document.querySelectorAll("footer,[role='contentinfo']").length,
        aside: document.querySelectorAll("aside,[role='complementary']").length,
      },
      images: document.images.length,
      links: document.querySelectorAll("a[href]").length,
      buttons: document.querySelectorAll("button,[role='button']").length,
      forms: document.forms.length,
      tables: document.querySelectorAll("table").length,
      iframes: document.querySelectorAll("iframe").length,
      inputs: document.querySelectorAll("input,select,textarea").length,
      dialogs: document.querySelectorAll("dialog,[role='dialog']").length,
    };

    const normalize = (value: URL) => {
      value.hash = "";
      if (value.pathname.length > 1) value.pathname = value.pathname.replace(/\/+$/, "");
      value.searchParams.sort();
      return value.toString();
    };
    const links: DiscoveredLink[] = [];
    document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
      try {
        const destination = new URL(anchor.href, document.baseURI);
        if (destination.protocol !== "http:" && destination.protocol !== "https:") return;
        const isInternal = destination.origin === origin;
        const anchorText = (anchor.innerText || anchor.getAttribute("aria-label") || anchor.title || Array.from(anchor.querySelectorAll("img[alt]"), (image) => image.getAttribute("alt") ?? "").join(" ")).trim();
        links.push({
          sourcePage: location.href,
          destinationUrl: normalize(destination),
          anchorText,
          isInternal,
          isEmpty: !anchorText,
          crawlStatus: isInternal ? "not-crawled" : "external",
        });
      } catch {
        // Ignore malformed href values.
      }
    });

    return { metadata, structure, links };
  }, startUrl.origin);
}

function normalizeUrl(rawUrl: string): string {
  const normalized = new URL(rawUrl);
  normalized.hash = "";
  if (normalized.pathname.length > 1) normalized.pathname = normalized.pathname.replace(/\/+$/, "");
  normalized.searchParams.sort();
  return normalized.toString();
}

function buildResult(
  startingUrl: string,
  pageLimit: number,
  durationMs: number,
  pages: CrawledPage[],
  failedPages: FailedCrawlPage[],
  links: DiscoveredLink[],
  discoveredPagesCount: number,
  limitReached: boolean,
): CrawlResult {
  const totalViolations = pages.reduce(
    (total, page) => total + page.violations.length,
    0
  );
  const hasHttpErrors = pages.some((page) => page.httpStatus >= 400);
  const crawledPages = new Map(pages.map((page) => [normalizeUrl(page.url), page.httpStatus]));
  const failedUrls = new Set(failedPages.map((page) => normalizeUrl(page.url)));
  const linkResults = links.map((link) => {
    const status = crawledPages.get(normalizeUrl(link.destinationUrl));
    const failed = failedUrls.has(normalizeUrl(link.destinationUrl));
    return {
      ...link,
      crawlStatus: !link.isInternal ? "external" : failed ? "failed" : status !== undefined ? "crawled" : "not-crawled",
      ...(status === undefined ? {} : { httpStatus: status }),
    } satisfies DiscoveredLink;
  });
  return {
    startingUrl,
    status: pages.length === 0
      ? "failed"
      : failedPages.length > 0 || hasHttpErrors || limitReached
        ? "partial"
        : "complete",
    scannedAt: new Date().toISOString(),
    durationMs,
    pageLimit,
    discoveredPagesCount,
    limitReached,
    pages,
    failedPages,
    links: linkResults,
    metadata: pages[0]?.metadata ?? null,
    totalViolations,
    totalPassedRules: pages.reduce((total, page) => total + page.passedChecks, 0),
    totalIncompleteChecks: pages.reduce((total, page) => total + page.incompleteChecks, 0),
    pagesWithViolations: pages.filter((page) => page.violations.length > 0).length,
    averageScore: pages.length ? Math.round(pages.reduce((total, page) => total + page.score, 0) / pages.length) : 0,
  };
}

export async function crawlUrl(
  startingUrl: string,
  maxPages = DEFAULT_MAX_PAGES
): Promise<CrawlResult> {
  const startedAt = Date.now();
  let startUrl: URL;
  try {
    startUrl = new URL(startingUrl);
    if (startUrl.protocol !== "http:" && startUrl.protocol !== "https:") {
      return emptyResult(startingUrl);
    }
    await validatePublicHttpUrl(startUrl);
    startUrl.hash = "";
  } catch {
    return emptyResult(startingUrl);
  }

  const pageLimit = Number.isFinite(maxPages)
    ? Math.min(MAX_PAGES, Math.max(1, Math.floor(maxPages)))
    : DEFAULT_MAX_PAGES;

  let browser: Browser | null = null;
  const pages: CrawledPage[] = [];
  const queue = [normalizeUrl(startUrl.toString())];
  const queued = new Set(queue);
  const visited = new Set<string>();
  const failedPages: FailedCrawlPage[] = [];
  const discoveredLinks: DiscoveredLink[] = [];

  try {
    try {
      browser = await chromium.launch({ headless: true });
    } catch (error) {
      console.error("[A11yFix] website crawler browser launch failed:", error);
      throw error;
    }
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
      } catch {
        await route.abort("blockedbyclient");
        return;
      }
      const resourceType = route.request().resourceType();
      if (
        resourceType === "image" ||
        resourceType === "font" ||
        resourceType === "media"
      ) {
        await route.abort();
        return;
      }
      await route.continue();
    });

    while (queue.length > 0 && visited.size < pageLimit) {
      const url = queue.shift();
      if (!url || visited.has(normalizeUrl(url))) {
        continue;
      }
      visited.add(normalizeUrl(url));

      try {
        const pageStartedAt = Date.now();
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: NAVIGATION_TIMEOUT_MS,
        });
        const finalUrl = page.url();
        const [axeResults, pageData] = await Promise.all([
          scanPage(page),
          extractPageData(page, startUrl),
        ]);
        const hasOgTitle = Boolean(pageData.metadata.openGraph["og:title"]?.trim());
        const rules = mapAxeRules(axeResults, finalUrl, hasOgTitle);
        const violations = mapViolations(axeResults.violations, finalUrl, hasOgTitle);
        const penalty = violations.reduce(
          (total, violation) => total + impactWeights[violation.impact],
          0
        );
        pages.push({
          url: finalUrl,
          title: pageData.metadata.title,
          httpStatus: response?.status() ?? 0,
          loadTimeMs: Date.now() - pageStartedAt,
          metadata: pageData.metadata,
          structure: pageData.structure,
          violations,
          rules,
          links: pageData.links,
          passedChecks: axeResults.passes.length,
          incompleteChecks: axeResults.incomplete.length,
          score: Math.max(0, 100 - penalty),
        });

        discoveredLinks.push(...pageData.links);
        for (const link of pageData.links) {
          const normalizedLink = normalizeUrl(link.destinationUrl);
          if (link.isInternal && !queued.has(normalizedLink) && !visited.has(normalizedLink)) {
            queued.add(normalizedLink);
            queue.push(normalizedLink);
          }
        }
      } catch (error) {
        const timedOut = error instanceof Error && /timeout|timed out/i.test(error.message);
        failedPages.push({
          url,
          error: timedOut
            ? "Page timed out during navigation or accessibility analysis."
            : "The browser could not load or analyze this page.",
          timedOut,
        });
      }
    }

    return buildResult(startUrl.toString(), pageLimit, Date.now() - startedAt, pages, failedPages, discoveredLinks, queued.size, visited.size >= pageLimit && queue.some((pendingUrl) => !visited.has(normalizeUrl(pendingUrl))));
  } catch (error) {
    if (pages.length === 0 && failedPages.length === 0) {
      failedPages.push({
        url: startUrl.toString(),
        error: error instanceof Error && /executable|browser.*launch/i.test(error.message)
          ? "The browser could not start. Install the Playwright Chromium browser and try again."
          : "The website scan could not start.",
        timedOut: false,
      });
    }
    return buildResult(startUrl.toString(), pageLimit, Date.now() - startedAt, pages, failedPages, discoveredLinks, queued.size, visited.size >= pageLimit && queue.some((pendingUrl) => !visited.has(normalizeUrl(pendingUrl))));
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Preserve the fail-safe result even if browser shutdown fails.
      }
    }
  }
}
