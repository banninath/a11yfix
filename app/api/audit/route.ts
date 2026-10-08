import { NextResponse } from "next/server";
import { auditUrl } from "@/lib/auditor";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (
      !isRecord(body) ||
      typeof body.url !== "string" ||
      !body.url.trim() ||
      !/^https?:\/\//i.test(body.url.trim())
    ) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const audit = await auditUrl(body.url.trim());
    return NextResponse.json({ audit });
  } catch (error: unknown) {
    console.error("[A11yFix] /api/audit error:", String(error));
    return NextResponse.json(
      { error: "The site health audit could not analyze this page. Verify the URL and try again." },
      { status: 500 },
    );
  }
}
