import { NextResponse } from "next/server";
import { applyFixes } from "@/lib/fixer";
import { isViolation } from "@/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    if (
      !isRecord(body) ||
      typeof body.html !== "string" ||
      !body.html.trim() ||
      !Array.isArray(body.violations) ||
      !body.violations.every(isViolation)
    ) {
      return NextResponse.json(
        { error: "Provide HTML and valid scan findings to prepare a repair." },
        { status: 400 }
      );
    }

    const result = await applyFixes(body.html, body.violations.filter(isViolation));
    return NextResponse.json(result);
  } catch (err) {
    console.error(
      "[A11yFix] /api/fix error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { error: "The repair could not be prepared. Review the input and try again." },
      { status: 500 }
    );
  }
}