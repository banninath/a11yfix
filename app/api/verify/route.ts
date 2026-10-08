import { NextResponse } from "next/server";
import { verifyFixes } from "@/lib/verifier";
import { isFix, isViolation } from "@/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    if (
      !isRecord(body) ||
      typeof body.originalHtml !== "string" ||
      typeof body.fixedHtml !== "string" ||
      !Array.isArray(body.originalViolations) ||
      !body.originalViolations.every(isViolation) ||
      !Array.isArray(body.fixes) ||
      !body.fixes.every(isFix)
    ) {
      return NextResponse.json(
        { error: "Provide the original page, proposed repair, and scan findings to verify a repair." },
        { status: 400 }
      );
    }

    const result = await verifyFixes(
      body.fixedHtml,
      body.originalViolations.filter(isViolation)
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error(
      "[A11yFix] /api/verify error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { error: "The repaired page could not be re-scanned. No repair was verified." },
      { status: 500 }
    );
  }
}