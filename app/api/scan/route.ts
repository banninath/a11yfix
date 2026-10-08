import { NextResponse } from "next/server";
import { crawlUrl } from "@/lib/crawler";
import { scanHtml, scanUrl } from "@/lib/scanner";
import {
  normalizeHttpUrlInput,
  UnsafeUrlError,
  validatePublicHttpUrl,
} from "@/lib/urlSecurity";
import type { ScanRequest } from "@/types";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function userSafeScanError(error: unknown, htmlInput: boolean): string {
  const message = error instanceof Error ? error.message : "";
  if (/timeout|timed out/i.test(message)) {
    return "The page timed out before the scan could finish. Check that the website is reachable and retry.";
  }
  if (/ERR_NAME_NOT_RESOLVED|ENOTFOUND|getaddrinfo|could not be resolved/i.test(message)) {
    return "The website hostname could not be resolved. Check the URL and try again.";
  }
  if (/ECONNREFUSED|ERR_CONNECTION_REFUSED|connection refused/i.test(message)) {
    return "The website refused the connection. Check that the site is online and try again.";
  }
  if (/executable.*doesn't exist|browserType\.launch|chromium.*launch/i.test(message)) {
    return "The scanning browser could not start. Install the Playwright Chromium browser and retry.";
  }
  if (/axe|accessibility tree|accessibility analysis/i.test(message)) {
    return "The page loaded, but automated accessibility analysis failed. Retry the scan.";
  }
  if (htmlInput) {
    return "The supplied HTML could not be analyzed. Check the markup and try again.";
  }
  return "We couldn't analyze this page. Verify the URL is reachable and try again.";
}

export async function POST(req: Request) {
  let htmlInput = false;
  try {
    const body: unknown = await req.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
    }
    htmlInput = typeof body.html === "string";

    if (body.crawl === true && typeof body.url === "string" && body.url.trim()) {
      let parsedUrl: URL;
      try {
        parsedUrl = await validatePublicHttpUrl(normalizeHttpUrlInput(body.url));
      } catch (error) {
        return NextResponse.json(
          {
            error: error instanceof UnsafeUrlError
              ? error.message
              : "The website URL could not be validated",
          },
          { status: error instanceof UnsafeUrlError ? 403 : 400 },
        );
      }
      const crawlResult = await crawlUrl(parsedUrl.toString());
      return NextResponse.json(crawlResult);
    }

    const request = body as ScanRequest;
    if (typeof request.url === "string" && request.url.trim()) {
      let safeUrl: URL;
      try {
        safeUrl = await validatePublicHttpUrl(normalizeHttpUrlInput(request.url));
      } catch (error) {
        return NextResponse.json(
          {
            error: error instanceof UnsafeUrlError
              ? error.message
              : "The website URL could not be validated",
          },
          { status: error instanceof UnsafeUrlError ? 403 : 400 },
        );
      }
      const result = await scanUrl(safeUrl.toString(), {
        includeHtmlSnapshot: request.includeHtmlSnapshot === true,
      });
      if (typeof result.httpStatus === "number" && result.httpStatus >= 400) {
        return NextResponse.json(
          {
            error: `The website responded with HTTP ${result.httpStatus}. The page was not treated as a successful scan.`,
            remoteHttpStatus: result.httpStatus,
          },
          { status: 502 },
        );
      }
      return NextResponse.json(result);
    }

    if (typeof request.html === "string" && request.html.trim()) {
      const result = await scanHtml(request.html);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Provide html or url" },
      { status: 400 }
    );
  } catch (err) {
    console.error(
      "[A11yFix] /api/scan error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { error: userSafeScanError(err, htmlInput) },
      { status: 500 }
    );
  }
}