import "server-only";
import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import type { AuditCategory, AuditCheck, AuditStatus, SiteAudit } from "@/types";
import { validatePublicHttpUrl } from "@/lib/urlSecurity";

interface PageData {
  title: string;
  description: string;
  viewport: string;
  charset: string;
  robots: string;
  canonical: string;
  favicon: string;
  lang: string;
  dir: string;
  rtlText: boolean;
  hreflangs: string[];
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  twitterTitle: string;
  jsonLd: boolean;
  headings: number[];
  main: boolean;
  nav: boolean;
  footer: boolean;
  skipLinkFirst: boolean;
  emptyLinks: number;
  hashNavLinks: number;
  internalLinks: string[];
  mixedContent: string[];
  htmlBytes: number;
  wordCount: number;
  imageCount: number;
  imagesMissingAlt: number;
}

function makeCheck(
  id: string,
  category: AuditCategory,
  label: string,
  status: AuditStatus,
  message: string,
  value?: string,
  suggestion?: string,
): AuditCheck {
  return { id, category, label, status, message, value, suggestion };
}

function makeAudit(url: string, checks: AuditCheck[]): SiteAudit {
  const passedCount = checks.filter(({ status }) => status === "pass").length;
  const warnCount = checks.filter(({ status }) => status === "warn").length;
  const failCount = checks.filter(({ status }) => status === "fail").length;
  const penalty = checks.reduce(
    (total, { status }) =>
      total + (status === "fail" ? 3 : status === "warn" ? 1 : 0),
    0,
  );

  return {
    url,
    checkedAt: new Date().toISOString(),
    checks,
    passedCount,
    warnCount,
    failCount,
    score:
      checks.length === 0
        ? 100
        : Math.max(0, Math.round(100 * (1 - penalty / (checks.length * 3)))),
  };
}

function getChecksForUnreachablePage(url: string): SiteAudit {
  return makeAudit(url, [
    makeCheck(
      "page-unreachable",
      "performance",
      "Page reachable",
      "fail",
      "The page could not be loaded before the navigation timed out.",
      undefined,
      "Check the URL and confirm the site is reachable.",
    ),
  ]);
}

interface AuditUrlResult {
  audit: SiteAudit;
  internalLinks: string[];
}

interface AuditOptions {
  maxInternalLinks: number;
  navigationTimeoutMs: number;
  headTimeoutMs: number;
}

const defaultAuditOptions: AuditOptions = {
  maxInternalLinks: 20,
  navigationTimeoutMs: 15_000,
  headTimeoutMs: 3_000,
};

async function auditUrlWithLinks(
  url: string,
  sharedBrowser?: Browser,
  options: AuditOptions = defaultAuditOptions,
): Promise<AuditUrlResult> {
  await validatePublicHttpUrl(url);
  let browser: Browser | undefined = sharedBrowser;
  let page: Page | undefined;
  let httpStatus = 0;
  const ownsBrowser = !sharedBrowser;

  try {
    browser ??= await chromium.launch({ headless: true });
    page = await browser.newPage();
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
      const type = route.request().resourceType();
      if (type === "image" || type === "font" || type === "media") {
        await route.abort();
        return;
      }
      await route.continue();
    });

    const navigationStart = Date.now();
    try {
      const navigationResponse = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: options.navigationTimeoutMs,
      });
      httpStatus = navigationResponse?.status() ?? 0;
    } catch {
      return { audit: getChecksForUnreachablePage(url), internalLinks: [] };
    }
    const loadTimeMs = Date.now() - navigationStart;

    const data = await page.evaluate((): PageData => {
      const meta = (name: string): string =>
        document
          .querySelector<HTMLMetaElement>(`meta[name="${name}" i]`)
          ?.content.trim() ?? "";
      const property = (name: string): string =>
        document
          .querySelector<HTMLMetaElement>(`meta[property="${name}" i]`)
          ?.content.trim() ?? "";
      const links = Array.from(document.querySelectorAll<HTMLLinkElement>("link"));
      const anchors = Array.from(
        document.querySelectorAll<HTMLAnchorElement>("a[href]"),
      );
      const focusable = Array.from(
        document.querySelectorAll<HTMLElement>(
          'a[href],area[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),iframe,object,embed,[tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const skipLinkFirst =
        first?.tagName === "A" &&
        (first.getAttribute("href") ?? "").startsWith("#") &&
        /skip|main|content/i.test(
          `${first.textContent ?? ""} ${first.getAttribute("aria-label") ?? ""} ${first.id}`,
        );
      const internalLinks = Array.from(
        new Set(
          anchors
            .map((anchor) => {
              try {
                const target = new URL(anchor.href, location.href);
                return target.origin === location.origin ? target.href : "";
              } catch {
                return "";
              }
            })
            .filter(Boolean),
        ),
      );
      const hreflangs = links
        .filter(
          (link) =>
            link.rel.toLowerCase() === "alternate" && !!link.hreflang.trim(),
        )
        .map((link) => link.hreflang.trim());
      const charset =
        document
          .querySelector<HTMLMetaElement>("meta[charset]")
          ?.getAttribute("charset") ??
        document
          .querySelector<HTMLMetaElement>('meta[http-equiv="content-type" i]')
          ?.content.match(/charset\s*=\s*([^;]+)/i)?.[1]
          ?.trim() ??
        "";
      const htmlElement = document.documentElement;
      const htmlText = htmlElement.innerText ?? "";
      const mixedContent = Array.from(
        document.querySelectorAll<HTMLElement>(
          "img[src],script[src],iframe[src],audio[src],video[src],source[src],link[href]",
        ),
      )
        .map(
          (element) =>
            element.getAttribute("src") ?? element.getAttribute("href") ?? "",
        )
        .filter((reference) => {
          try {
            return (
              location.protocol === "https:" &&
              new URL(reference, location.href).protocol === "http:"
            );
          } catch {
            return false;
          }
        });

      return {
        title: document.title.trim(),
        description: meta("description"),
        viewport: meta("viewport"),
        charset,
        robots: meta("robots"),
        canonical:
          links.find((link) => link.rel.toLowerCase() === "canonical")?.href ??
          "",
        favicon: links.some((link) =>
          link.rel.toLowerCase().split(/\s+/).includes("icon"),
        )
          ? "present"
          : "",
        lang: htmlElement.lang.trim(),
        dir: htmlElement.dir.trim().toLowerCase(),
        rtlText: /[\u0590-\u08ff\uFB1D-\uFDFF\uFE70-\uFEFF]/u.test(htmlText),
        hreflangs,
        ogTitle: property("og:title"),
        ogDescription: property("og:description"),
        ogImage: property("og:image"),
        twitterCard: meta("twitter:card"),
        twitterTitle: meta("twitter:title"),
        jsonLd: !!document.querySelector('script[type="application/ld+json"]'),
        headings: Array.from(
          document.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6"),
        ).map((heading) => Number(heading.tagName.slice(1))),
        main: !!document.querySelector("main"),
        nav: !!document.querySelector("nav"),
        footer: !!document.querySelector("footer"),
        skipLinkFirst,
        emptyLinks: anchors.filter(
          (anchor) =>
            !anchor.textContent?.trim() &&
            !anchor.getAttribute("aria-label")?.trim() &&
            !anchor.getAttribute("aria-labelledby")?.trim(),
        ).length,
        hashNavLinks: Array.from(
          document.querySelectorAll<HTMLAnchorElement>('nav a[href="#"]'),
        ).length,
        internalLinks,
        mixedContent,
        htmlBytes: new Blob([htmlElement.outerHTML]).size,
        wordCount: htmlText.trim().split(/\s+/).filter(Boolean).length,
        imageCount: document.querySelectorAll("img").length,
        imagesMissingAlt: Array.from(
          document.querySelectorAll<HTMLImageElement>("img"),
        ).filter((image) => !image.hasAttribute("alt")).length,
      };
    });

    const checks: AuditCheck[] = [];
    const titleLength = data.title.length;
    checks.push(
      makeCheck(
        "title",
        "metadata",
        "Page title",
        titleLength >= 10 && titleLength <= 60
          ? "pass"
          : data.title
            ? "warn"
            : "fail",
        data.title
          ? `Title is ${titleLength} characters long.`
          : "No page title was found.",
        data.title || undefined,
        !data.title
          ? "Add a descriptive <title> element."
          : titleLength < 10 || titleLength > 60
            ? "Keep the title between 10 and 60 characters."
            : undefined,
      ),
      makeCheck(
        "description",
        "metadata",
        "Meta description",
        data.description.length >= 50 && data.description.length <= 160
          ? "pass"
          : data.description
            ? "warn"
            : "fail",
        data.description
          ? `Description is ${data.description.length} characters long.`
          : "No meta description was found.",
        data.description || undefined,
        !data.description
          ? "Add a concise meta description."
          : "Keep the description between 50 and 160 characters.",
      ),
      makeCheck(
        "viewport",
        "metadata",
        "Viewport",
        /(?:^|,)\s*width\s*=\s*device-width\b/i.test(data.viewport)
          ? "pass"
          : "fail",
        data.viewport
          ? "Viewport metadata is present."
          : "Viewport metadata is missing.",
        data.viewport || undefined,
        "Add a viewport meta tag with width=device-width.",
      ),
      makeCheck(
        "charset",
        "metadata",
        "Character encoding",
        data.charset ? "pass" : "fail",
        data.charset
          ? `Character encoding is declared as ${data.charset}.`
          : "No character encoding declaration was found.",
        data.charset || undefined,
        "Declare the encoding with <meta charset=\"utf-8\">.",
      ),
      makeCheck(
        "robots",
        "metadata",
        "Robots indexing",
        /\bnoindex\b/i.test(data.robots) ? "warn" : "pass",
        /\bnoindex\b/i.test(data.robots)
          ? "Robots metadata asks search engines not to index the page."
          : "No noindex directive was found.",
        data.robots || undefined,
        "Remove noindex if this page should appear in search results.",
      ),
      makeCheck(
        "canonical",
        "metadata",
        "Canonical URL",
        data.canonical ? "pass" : "fail",
        data.canonical
          ? "A canonical URL is declared."
          : "No canonical URL was found.",
        data.canonical || undefined,
        "Add a <link rel=\"canonical\"> for the preferred page URL.",
      ),
      makeCheck(
        "favicon",
        "metadata",
        "Favicon",
        data.favicon ? "pass" : "warn",
        data.favicon ? "A favicon link is present." : "No favicon link was found.",
        data.favicon || undefined,
        "Add a link to the site's favicon.",
      ),
    );

    let validLang = false;
    try {
      if (data.lang) {
        new Intl.Locale(data.lang);
        validLang = true;
      }
    } catch {
      validLang = false;
    }
    checks.push(
      makeCheck(
        "html-lang",
        "language",
        "HTML language",
        data.lang ? "pass" : "fail",
        data.lang ? `The page language is ${data.lang}.` : "The html lang attribute is missing.",
        data.lang || undefined,
        "Set the correct language on the <html> element.",
      ),
      makeCheck(
        "bcp47-lang",
        "language",
        "Language tag format",
        validLang ? "pass" : "fail",
        validLang
          ? "The language value is a valid BCP-47 tag."
          : "The language value is missing or invalid.",
        data.lang || undefined,
        "Use a valid BCP-47 tag such as en or en-US.",
      ),
      makeCheck(
        "html-dir",
        "language",
        "Text direction",
        data.dir === "ltr" || data.dir === "rtl"
          ? "pass"
          : data.rtlText
            ? "fail"
            : "warn",
        data.dir === "ltr" || data.dir === "rtl"
          ? `Text direction is ${data.dir}.`
          : "No explicit ltr or rtl direction is set.",
        data.dir || undefined,
        "Set dir=\"ltr\" or dir=\"rtl\" on the <html> element.",
      ),
      makeCheck(
        "hreflang",
        "language",
        "Language alternates",
        data.hreflangs.length > 0 ? "pass" : "warn",
        data.hreflangs.length
          ? `${data.hreflangs.length} hreflang alternate(s) are declared.`
          : "No hreflang alternate links were found.",
        data.hreflangs.join(", ") || undefined,
        "Add hreflang alternate links when translated versions are available.",
      ),
    );

    checks.push(
      makeCheck(
        "open-graph",
        "sharing",
        "Open Graph tags",
        data.ogTitle && data.ogDescription && data.ogImage ? "pass" : "fail",
        `og:title ${data.ogTitle ? "present" : "missing"}, og:description ${data.ogDescription ? "present" : "missing"}, og:image ${data.ogImage ? "present" : "missing"}.`,
        [data.ogTitle, data.ogDescription, data.ogImage]
          .filter(Boolean)
          .join(" | ") || undefined,
        "Add og:title, og:description, and og:image metadata.",
      ),
      makeCheck(
        "twitter-card",
        "sharing",
        "Twitter Card",
        data.twitterCard && data.twitterTitle ? "pass" : "fail",
        `twitter:card ${data.twitterCard ? "present" : "missing"}, twitter:title ${data.twitterTitle ? "present" : "missing"}.`,
        [data.twitterCard, data.twitterTitle].filter(Boolean).join(" | ") ||
          undefined,
        "Add twitter:card and twitter:title metadata.",
      ),
      makeCheck(
        "json-ld",
        "sharing",
        "JSON-LD structured data",
        data.jsonLd ? "pass" : "warn",
        data.jsonLd
          ? "JSON-LD structured data is present."
          : "No JSON-LD structured data was found.",
        data.jsonLd ? "present" : undefined,
        "Add appropriate JSON-LD structured data when relevant.",
      ),
    );

    let ogImageStatus: AuditStatus = "warn";
    let ogImageMessage = "No Open Graph image URL is available to check.";
    if (data.ogImage) {
      try {
        const response = await page.request.head(
          new URL(data.ogImage, url).href,
          { timeout: options.headTimeoutMs },
        );
        ogImageStatus = response.ok() ? "pass" : "warn";
        ogImageMessage = response.ok()
          ? "The Open Graph image URL is reachable."
          : `The Open Graph image returned HTTP ${response.status()}.`;
      } catch {
        ogImageMessage = "The Open Graph image URL could not be reached.";
      }
    }
    checks.push(
      makeCheck(
        "og-image-reachable",
        "sharing",
        "Open Graph image reachable",
        ogImageStatus,
        ogImageMessage,
        data.ogImage || undefined,
        ogImageStatus === "warn"
          ? "Use a publicly reachable URL for og:image."
          : undefined,
      ),
    );

    const h1Count = data.headings.filter((level) => level === 1).length;
    const headingSkip = data.headings.some(
      (level, index) =>
        index > 0 && level > (data.headings[index - 1] ?? level) + 1,
    );
    checks.push(
      makeCheck(
        "single-h1",
        "structure",
        "Single H1 heading",
        h1Count === 1 ? "pass" : "fail",
        `Found ${h1Count} H1 heading(s).`,
        String(h1Count),
        "Use exactly one descriptive H1 heading.",
      ),
      makeCheck(
        "content-word-count",
        "structure",
        "Page text content",
        data.wordCount >= 300 ? "pass" : "warn",
        `Found approximately ${data.wordCount} words of visible text.`,
        String(data.wordCount),
        data.wordCount < 300
          ? "Consider adding useful, original content where the page purpose calls for it."
          : undefined,
      ),
      makeCheck(
        "image-alt-coverage",
        "structure",
        "Image alternative text",
        data.imagesMissingAlt === 0 ? "pass" : "warn",
        data.imagesMissingAlt === 0
          ? `All ${data.imageCount} image(s) declare alternative text.`
          : `${data.imagesMissingAlt} of ${data.imageCount} image(s) are missing an alt attribute.`,
        `${data.imagesMissingAlt}/${data.imageCount} missing`,
        data.imagesMissingAlt > 0
          ? "Add useful alt text to informative images; use alt=\"\" for decorative images."
          : undefined,
      ),
      makeCheck(
        "heading-order",
        "structure",
        "Heading order",
        headingSkip ? "warn" : "pass",
        headingSkip
          ? "One or more heading levels are skipped."
          : "Heading levels do not skip.",
        data.headings.map((level) => `H${level}`).join(" → ") || undefined,
        "Arrange headings in order without skipping levels.",
      ),
      makeCheck(
        "main-landmark",
        "structure",
        "Main landmark",
        data.main ? "pass" : "fail",
        data.main ? "A main landmark is present." : "No <main> landmark was found.",
        data.main ? "present" : undefined,
        "Wrap the primary page content in a <main> element.",
      ),
      makeCheck(
        "nav-landmark",
        "structure",
        "Navigation landmark",
        data.nav ? "pass" : "fail",
        data.nav ? "A navigation landmark is present." : "No <nav> landmark was found.",
        data.nav ? "present" : undefined,
        "Use a <nav> landmark for primary site navigation.",
      ),
      makeCheck(
        "footer-landmark",
        "structure",
        "Footer landmark",
        data.footer ? "pass" : "fail",
        data.footer ? "A footer landmark is present." : "No <footer> landmark was found.",
        data.footer ? "present" : undefined,
        "Add a <footer> landmark for footer content.",
      ),
      makeCheck(
        "skip-link",
        "structure",
        "Skip-to-content link",
        data.skipLinkFirst ? "pass" : "fail",
        data.skipLinkFirst
          ? "The first focusable element is a skip-to-content link."
          : "A skip-to-content link was not found as the first focusable element.",
        data.skipLinkFirst ? "present" : undefined,
        "Make the first focusable element a link to the main content.",
      ),
    );

    checks.push(
      makeCheck(
        "empty-links",
        "links",
        "Link names",
        data.emptyLinks === 0 ? "pass" : "fail",
        data.emptyLinks === 0
          ? "All links have an accessible name."
          : `Found ${data.emptyLinks} link(s) without text or an accessible label.`,
        String(data.emptyLinks),
        "Give every link descriptive text or an accessible label.",
      ),
      makeCheck(
        "hash-navigation",
        "links",
        "Primary navigation links",
        data.hashNavLinks === 0 ? "pass" : "warn",
        data.hashNavLinks === 0
          ? "No placeholder href=\"#\" links were found in navigation."
          : `Found ${data.hashNavLinks} href="#" link(s) in navigation.`,
        String(data.hashNavLinks),
        "Replace placeholder navigation links with real destinations or buttons.",
      ),
    );

    const linksToCheck = data.internalLinks.slice(
      0,
      options.maxInternalLinks,
    );
    const request = page.request;
    const brokenLinks = await Promise.all(
      linksToCheck.map(async (link) => {
        try {
          await validatePublicHttpUrl(link);
          const response = await request.head(link, {
            timeout: options.headTimeoutMs,
            maxRedirects: 0,
          });
          return response.status() >= 400 ? link : null;
        } catch {
          return link;
        }
      }),
    );
    const broken = brokenLinks.filter((link): link is string => link !== null);
    checks.push(
      makeCheck(
        "broken-internal-links",
        "links",
        "Internal links",
        broken.length ? "warn" : "pass",
        broken.length
          ? `${broken.length} of ${linksToCheck.length} checked internal link(s) did not respond successfully.`
          : `No broken responses among ${linksToCheck.length} checked internal link(s).`,
        broken.slice(0, 5).join(", ") || `${linksToCheck.length} checked`,
        broken.length
          ? "Check these destinations; some servers do not support HEAD requests."
          : undefined,
      ),
      makeCheck(
        "internal-link-present",
        "links",
        "Internal link present",
        data.internalLinks.length ? "pass" : "warn",
        data.internalLinks.length
          ? `Found ${data.internalLinks.length} same-origin link(s).`
          : "No same-origin links were found.",
        String(data.internalLinks.length),
        "Add at least one link to another page on this site.",
      ),
    );

    const protocol = new URL(url).protocol;
    checks.push(
      makeCheck(
        "load-time",
        "performance",
        "Page load time",
        loadTimeMs <= 5_000 ? "pass" : "warn",
        `DOMContentLoaded completed in ${(loadTimeMs / 1000).toFixed(2)} seconds.`,
        `${loadTimeMs} ms`,
        "Reduce blocking resources and server response time.",
      ),
      makeCheck(
        "http-status",
        "performance",
        "HTTP response status",
        httpStatus >= 200 && httpStatus < 400 ? "pass" : "fail",
        httpStatus
          ? `The page returned HTTP ${httpStatus}.`
          : "No HTTP response status was available.",
        String(httpStatus || "unknown"),
        httpStatus >= 400 || httpStatus === 0
          ? "Resolve the server error or redirect the URL to a working page."
          : undefined,
      ),
      makeCheck(
        "https",
        "performance",
        "HTTPS",
        protocol === "https:" ? "pass" : "warn",
        protocol === "https:"
          ? "The page uses HTTPS."
          : "The page is not served over HTTPS.",
        protocol,
        "Serve the page over HTTPS.",
      ),
      makeCheck(
        "mixed-content",
        "performance",
        "Mixed content",
        data.mixedContent.length ? "warn" : "pass",
        data.mixedContent.length
          ? `Found ${data.mixedContent.length} HTTP resource(s) on the HTTPS page.`
          : "No HTTP resources were found on the HTTPS page.",
        data.mixedContent.slice(0, 5).join(", ") || undefined,
        "Load all page resources over HTTPS.",
      ),
      makeCheck(
        "html-size",
        "performance",
        "HTML document size",
        data.htmlBytes < 500 * 1024 ? "pass" : "warn",
        `HTML document is ${(data.htmlBytes / 1024).toFixed(1)} KB.`,
        `${data.htmlBytes} bytes`,
        "Keep the HTML document under 500 KB.",
      ),
    );

    return { audit: makeAudit(url, checks), internalLinks: data.internalLinks };
  } catch (error: unknown) {
    console.error("Site audit failed:", error);
    return { audit: getChecksForUnreachablePage(url), internalLinks: [] };
  } finally {
    if (page && sharedBrowser) {
      try {
        await page.close();
      } catch (error: unknown) {
        console.error("Failed to close audit page:", error);
      }
    }
    if (browser && ownsBrowser) {
      try {
        await browser.close();
      } catch (error: unknown) {
        console.error("Failed to close audit browser:", error);
      }
    }
  }
}

export async function auditUrl(url: string): Promise<SiteAudit> {
  const result = await auditUrlWithLinks(url);
  return result.audit;
}

export async function auditDomain(
  startingUrl: string,
  maxPages = 5,
): Promise<SiteAudit[]> {
  let root: URL;
  try {
    root = new URL(startingUrl);
    if (root.protocol !== "http:" && root.protocol !== "https:") {
      return [getChecksForUnreachablePage(startingUrl)];
    }
    root = await validatePublicHttpUrl(root);
    root.hash = "";
  } catch {
    return [getChecksForUnreachablePage(startingUrl)];
  }

  const pageLimit = Number.isFinite(maxPages)
    ? Math.min(10, Math.max(1, Math.floor(maxPages)))
    : 5;
  const pending = [root.href];
  const queued = new Set(pending);
  const audited = new Set<string>();
  const audits: SiteAudit[] = [];
  let browser: Browser | undefined;

  try {
    browser = await chromium.launch({ headless: true });
    while (pending.length > 0 && audits.length < pageLimit) {
      const batch: string[] = [];
      while (
        pending.length > 0 &&
        batch.length < 4 &&
        audits.length + batch.length < pageLimit
      ) {
        const candidate = pending.shift();
        if (candidate && !audited.has(candidate)) {
          audited.add(candidate);
          batch.push(candidate);
        }
      }

      const results = await Promise.all(
        batch.map((pageUrl) =>
          auditUrlWithLinks(pageUrl, browser, {
            maxInternalLinks: 2,
            navigationTimeoutMs: 8_000,
            headTimeoutMs: 1_200,
          }),
        ),
      );
      for (const result of results) {
        audits.push(result.audit);
        for (const href of result.internalLinks) {
          try {
            const candidate = new URL(href);
            candidate.hash = "";
            if (
              candidate.origin === root.origin &&
              !queued.has(candidate.href) &&
              !audited.has(candidate.href)
            ) {
              queued.add(candidate.href);
              pending.push(candidate.href);
            }
          } catch {
            continue;
          }
        }
      }
    }
  } catch (error: unknown) {
    console.error("Domain audit failed:", error);
    if (audits.length === 0) {
      audits.push(getChecksForUnreachablePage(root.href));
    }
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error: unknown) {
        console.error("Failed to close domain audit browser:", error);
      }
    }
  }

  const uniqueCheck = (
    audit: SiteAudit,
    checkId: string,
  ): AuditCheck | undefined =>
    audit.checks.find((item) => item.id === checkId);
  const titleCounts = new Map<string, number>();
  const descriptionCounts = new Map<string, number>();
  for (const audit of audits) {
    const title = uniqueCheck(audit, "title")?.value?.trim().toLowerCase();
    const description = uniqueCheck(audit, "description")
      ?.value?.trim()
      .toLowerCase();
    if (title) titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);
    if (description) {
      descriptionCounts.set(
        description,
        (descriptionCounts.get(description) ?? 0) + 1,
      );
    }
  }

  return audits.map((audit) => {
    const title = uniqueCheck(audit, "title")?.value?.trim().toLowerCase();
    const description = uniqueCheck(audit, "description")
      ?.value?.trim()
      .toLowerCase();
    const checks = [...audit.checks];
    if (title) {
      const duplicate = (titleCounts.get(title) ?? 0) > 1;
      checks.push(
        makeCheck(
          "unique-title",
          "metadata",
          "Title uniqueness",
          duplicate ? "warn" : "pass",
          duplicate
            ? "This title is repeated on another audited page."
            : "This title is unique among audited pages.",
          uniqueCheck(audit, "title")?.value,
          duplicate ? "Write a distinct title for this page." : undefined,
        ),
      );
    }
    if (description) {
      const duplicate = (descriptionCounts.get(description) ?? 0) > 1;
      checks.push(
        makeCheck(
          "unique-description",
          "metadata",
          "Description uniqueness",
          duplicate ? "warn" : "pass",
          duplicate
            ? "This description is repeated on another audited page."
            : "This description is unique among audited pages.",
          uniqueCheck(audit, "description")?.value,
          duplicate ? "Write a distinct description for this page." : undefined,
        ),
      );
    }
    return makeAudit(audit.url, checks);
  });
}
