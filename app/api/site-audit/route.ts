import { NextResponse } from "next/server";
import {
  normalizeHttpUrlInput,
  UnsafeUrlError,
  validatePublicHttpUrl,
} from "@/lib/urlSecurity";

export const runtime = "nodejs";

interface AuditResult {
  url: string;
  score: number;
  metadata: {
    title: string;
    description: string;
    keywords: string[];
    titleLength: number;
    descriptionLength: number;
    titleScore: number;
    descriptionScore: number;
    hasTitle: boolean;
    hasDescription: boolean;
    hasKeywords: boolean;
    titleIssues: string[];
    descriptionIssues: string[];
  };
  pageQuality: {
    contentLength: number;
    headingStructure: {
      h1: number;
      h2: number;
      h3: number;
      h4: number;
      h5: number;
      h6: number;
      hasH1: boolean;
      hasMultipleH1: boolean;
      headingIssues: string[];
    };
    textContent: string;
    readabilityScore: number;
    pageScore: number;
  };
  links: {
    totalLinks: number;
    internalLinks: number;
    externalLinks: number;
    brokenLinks: number;
    redirectLinks: number;
    linkIssues: string[];
    links: Array<{
      text: string;
      url: string;
      type: "internal" | "external" | "broken" | "redirect";
      status: number;
    }>;
  };
  errors: {
    totalErrors: number;
    criticalErrors: string[];
    warnings: string[];
    info: string[];
    htmlErrors: string[];
    seoErrors: string[];
    accessibilityErrors: string[];
  };
  performance: {
    loadTime: number;
    responseTime: number;
    status: number;
    statusText: string;
  };
  timestamp: string;
}

interface AuditRequest {
  url: string;
  checkMetadata?: boolean;
  checkPageQuality?: boolean;
  checkLinks?: boolean;
  checkPerformance?: boolean;
}

function extractMetadata(html: string): AuditResult["metadata"] {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  
  const title = titleMatch ? titleMatch[1].trim() : "";
  const description = descriptionMatch ? descriptionMatch[1].trim() : "";
  const keywords = keywordsMatch ? keywordsMatch[1].split(/[,;\s]+/).filter(k => k.trim()) : [];
  
  const titleIssues = [];
  const descriptionIssues = [];
  
  // Title analysis
  if (!title) {
    titleIssues.push("Missing title tag");
  } else {
    if (title.length < 10) titleIssues.push("Title too short");
    if (title.length > 60) titleIssues.push("Title too long");
    if (title.length >= 10 && title.length <= 60) titleIssues.push("Good title length");
  }
  
  // Description analysis
  if (!description) {
    descriptionIssues.push("Missing meta description");
  } else {
    if (description.length < 50) descriptionIssues.push("Description too short");
    if (description.length > 160) descriptionIssues.push("Description too long");
    if (description.length >= 50 && description.length <= 160) descriptionIssues.push("Good description length");
  }
  
  const titleScore = Math.max(0, 100 - (titleIssues.length * 25));
  const descriptionScore = Math.max(0, 100 - (descriptionIssues.length * 25));
  
  return {
    title,
    description,
    keywords,
    titleLength: title.length,
    descriptionLength: description.length,
    titleScore,
    descriptionScore,
    hasTitle: !!title,
    hasDescription: !!description,
    hasKeywords: keywords.length > 0,
    titleIssues,
    descriptionIssues
  };
}

function analyzePageQuality(html: string): AuditResult["pageQuality"] {
  const textContent = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const contentLength = textContent.length;
  
  // Count headings
  const headingCounts = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
  const headingRegex = /<h[1-6][^>]*>/gi;
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const level = match[0].charAt(2);
    headingCounts[level as keyof typeof headingCounts]++;
  }
  
  const headingIssues = [];
  if (!headingCounts.h1) {
    headingIssues.push("Missing H1 tag");
  } else if (headingCounts.h1 > 1) {
    headingIssues.push("Multiple H1 tags found");
  }
  
  // Readability score calculation (simplified)
  const words = textContent.split(/\s+/);
  const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
  const avgWordsPerSentenceScore = Math.max(0, 100 - Math.abs(15 - avgWordsPerSentence) * 5);
  
  const pageScore = Math.max(0, 100 - headingIssues.length * 20);
  
  return {
    contentLength,
    headingStructure: {
      ...headingCounts,
      hasH1: !!headingCounts.h1,
      hasMultipleH1: headingCounts.h1 > 1,
      headingIssues
    },
    textContent,
    readabilityScore: avgWordsPerSentenceScore,
    pageScore
  };
}

function extractErrors(html: string, metadata: AuditResult["metadata"], pageQuality: AuditResult["pageQuality"]): AuditResult["errors"] {
  const errors = {
    totalErrors: 0,
    criticalErrors: [] as string[],
    warnings: [] as string[],
    info: [] as string[],
    htmlErrors: [] as string[],
    seoErrors: [] as string[],
    accessibilityErrors: [] as string[]
  };
  
  // HTML validation errors (simplified)
  if (!html.includes("<!DOCTYPE html>")) {
    errors.warnings.push("Missing DOCTYPE declaration");
  }
  
  if (!html.includes("<html")) {
    errors.criticalErrors.push("Missing <html> tag");
    errors.totalErrors++;
  }
  
  if (!html.includes("<head")) {
    errors.criticalErrors.push("Missing <head> section");
    errors.totalErrors++;
  }
  
  if (!html.includes("<body")) {
    errors.criticalErrors.push("Missing <body> section");
    errors.totalErrors++;
  }
  
  // SEO errors
  if (!metadata.hasTitle) {
    errors.seoErrors.push("Missing title tag");
    errors.totalErrors++;
  }
  
  if (!metadata.hasDescription) {
    errors.seoErrors.push("Missing meta description");
    errors.totalErrors++;
  }
  
  if (metadata.titleIssues.length > 0) {
    errors.warnings.push(...metadata.titleIssues);
    errors.totalErrors += metadata.titleIssues.length;
  }
  
  if (metadata.descriptionIssues.length > 0) {
    errors.warnings.push(...metadata.descriptionIssues);
    errors.totalErrors += metadata.descriptionIssues.length;
  }
  
  // Accessibility errors
  if (!pageQuality.headingStructure.hasH1) {
    errors.accessibilityErrors.push("Missing H1 heading");
    errors.totalErrors++;
  }
  
  if (pageQuality.headingStructure.hasMultipleH1) {
    errors.accessibilityErrors.push("Multiple H1 headings found");
    errors.totalErrors++;
  }
  
  if (pageQuality.contentLength < 100) {
    errors.warnings.push("Page content is very short");
  }
  
  return errors;
}

function analyzeLinks(html: string, baseUrl: string): AuditResult["links"] {
  const matches = Array.from(html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi));
  const links: AuditResult["links"]["links"] = matches.map(([, rawHref, rawText]) => {
    const href = rawHref.trim();
    const text = (rawText || "").replace(/<[^>]+>/g, "").trim();
    const normalizedHref = href.startsWith("http") ? href : new URL(href, `https://${baseUrl}`).toString();
    const isInternal = normalizedHref.startsWith(`https://${baseUrl}`) || normalizedHref.startsWith(`http://${baseUrl}`) || normalizedHref.startsWith("/") || normalizedHref.startsWith("#");

    return {
      text: text || "Untitled link",
      url: normalizedHref,
      type: isInternal ? "internal" : "external",
      status: 200,
    };
  });

  const internalLinks = links.filter((link) => link.type === "internal").length;
  const externalLinks = links.filter((link) => link.type === "external").length;

  return {
    totalLinks: links.length,
    internalLinks,
    externalLinks,
    brokenLinks: 0,
    redirectLinks: 0,
    linkIssues: links.length === 0 ? ["No links found on the page"] : [],
    links,
  };
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
    }
    
    const { url, checkMetadata = true, checkPageQuality = true, checkLinks = true } = body as AuditRequest;
    
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }
    
    let safeUrl: URL;
    try {
      safeUrl = await validatePublicHttpUrl(normalizeHttpUrlInput(url));
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof UnsafeUrlError ? error.message : "Invalid website URL" },
        { status: 400 },
      );
    }
    const normalizedUrl = safeUrl.toString();
    const baseUrl = normalizedUrl.split("/")[2];
    
    const startTime = Date.now();
    
    try {
      // Fetch the page
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      let currentUrl = safeUrl;
      let response: Response | null = null;
      try {
        for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
          response = await fetch(currentUrl, {
            method: "GET",
            signal: controller.signal,
            redirect: "manual",
            headers: {
              "User-Agent": "A11yFix/1.0 (+https://a11yfix.app)",
              Accept: "text/html",
            },
          });
          if (![301, 302, 303, 307, 308].includes(response.status)) break;
          const location = response.headers.get("location");
          await response.body?.cancel();
          if (!location || redirectCount === 5) throw new Error("Redirect limit reached");
          currentUrl = await validatePublicHttpUrl(new URL(location, currentUrl));
        }
      } finally {
        clearTimeout(timeout);
      }
      
      if (!response?.ok) {
        throw new Error("Remote server returned an unsuccessful response");
      }
      
      const html = await response.text();
      const responseTime = Date.now() - startTime;
      
      // Extract metadata
      const metadata = checkMetadata ? extractMetadata(html) : {
        title: "",
        description: "",
        keywords: [],
        titleLength: 0,
        descriptionLength: 0,
        titleScore: 0,
        descriptionScore: 0,
        hasTitle: false,
        hasDescription: false,
        hasKeywords: false,
        titleIssues: [],
        descriptionIssues: []
      };
      
      // Analyze page quality
      const pageQuality = checkPageQuality ? analyzePageQuality(html) : {
        contentLength: 0,
        headingStructure: {
          h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0,
          hasH1: false,
          hasMultipleH1: false,
          headingIssues: []
        },
        textContent: "",
        readabilityScore: 0,
        pageScore: 0
      };
      
      // Analyze links
      const links = checkLinks ? analyzeLinks(html, baseUrl) : {
        totalLinks: 0,
        internalLinks: 0,
        externalLinks: 0,
        brokenLinks: 0,
        redirectLinks: 0,
        linkIssues: [],
        links: []
      };
      
      // Extract errors
      const errors = extractErrors(html, metadata, pageQuality);
      
      // Calculate overall score
      const scores = [
        metadata.titleScore,
        metadata.descriptionScore,
        pageQuality.pageScore,
        pageQuality.readabilityScore,
        Math.max(0, 100 - errors.totalErrors * 10)
      ];
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      const result: AuditResult = {
        url: currentUrl.toString(),
        score: Math.round(averageScore),
        metadata,
        pageQuality,
        links,
        errors,
        performance: {
          loadTime: responseTime,
          responseTime: responseTime,
          status: response.status,
          statusText: response.statusText
        },
        timestamp: new Date().toISOString()
      };
      
      return NextResponse.json({
        result,
        processed: 1,
        timestamp: new Date().toISOString()
      });
      
    } catch (fetchError) {
      console.error("[A11yFix] Site health request failed:", fetchError instanceof Error ? fetchError.message : String(fetchError));
      throw new Error("We couldn't analyze this page. Verify the URL is reachable and try again.");
    }
    
  } catch (error) {
    console.error("[A11yFix] /api/site-audit error:", error);
    return NextResponse.json(
      { error: "Site audit failed. Verify the URL is reachable and try again." },
      { status: 500 }
    );
  }
}