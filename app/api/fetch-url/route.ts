import { NextResponse } from "next/server";
import {
  normalizeHttpUrlInput,
  UnsafeUrlError,
  validatePublicHttpUrl,
} from "@/lib/urlSecurity";

export const runtime = "nodejs";

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function readHtmlResponse(
  response: Response,
  signal: AbortSignal
): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const declaredSize = Number(contentLength);
    if (Number.isFinite(declaredSize) && declaredSize > MAX_RESPONSE_BYTES) {
      throw new RangeError("Response exceeds the 2 MB limit");
    }
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      if (signal.aborted) {
        throw new DOMException("Request timed out", "AbortError");
      }

      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new RangeError("Response exceeds the 2 MB limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(bytes);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON", 400);
  }

  if (!isRecord(body)) {
    return errorResponse("Request body must be an object", 400);
  }

  let url: URL;
  try {
    if (typeof body.url !== "string" || !body.url.trim()) {
      return errorResponse("Provide a valid website URL using HTTP or HTTPS", 400);
    }
    url = await validatePublicHttpUrl(normalizeHttpUrlInput(body.url));
  } catch (error) {
    return errorResponse(
      error instanceof UnsafeUrlError
        ? error.message
        : "The website URL could not be validated",
      400,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let currentUrl = url;
    let response: Response | null = null;
    for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
      response = await fetch(currentUrl, {
        method: "GET",
        headers: {
          "User-Agent": "A11yFix/1.0 (+https://a11yfix.app)",
          Accept: "text/html",
        },
        redirect: "manual",
        signal: controller.signal,
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location || redirectCount === 5) {
        return errorResponse("The website redirected too many times", 502);
      }
      try {
        currentUrl = await validatePublicHttpUrl(new URL(location, currentUrl));
      } catch (error) {
        return errorResponse(
          error instanceof UnsafeUrlError
            ? "The website redirected to a URL that cannot be scanned"
            : "The redirect destination could not be validated",
          403,
        );
      }
    }

    if (!response || !response.ok) {
      return errorResponse(
        `Remote server returned HTTP ${response?.status ?? 502}`,
        502
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      return errorResponse("Remote response is not text/html", 415);
    }

    const html = await readHtmlResponse(response, controller.signal);
    return NextResponse.json({
      html,
      finalUrl: response.url || currentUrl.toString(),
    });
  } catch (error) {
    if (error instanceof RangeError) {
      return errorResponse(error.message, 413);
    }

    if (controller.signal.aborted) {
      return errorResponse("Remote request timed out after 10 seconds", 504);
    }

    console.error(
      "[A11yFix] /api/fetch-url error:",
      error instanceof Error ? error.message : String(error)
    );
    return errorResponse("Could not fetch remote HTML", 502);
  } finally {
    clearTimeout(timeout);
  }
}
