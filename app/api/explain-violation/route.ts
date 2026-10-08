import { NextResponse } from "next/server";
import { explainViolation } from "@/lib/explainer";
import { isViolation } from "@/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  if (!isRecord(body) || !isViolation(body.violation)) {
    return NextResponse.json(
      { error: "A valid violation is required" },
      { status: 400 }
    );
  }

  if (body.violation.fixableType === "not-fixable") {
    return NextResponse.json(
      { error: "Explanations are available for fixable violations only" },
      { status: 400 }
    );
  }

  try {
    const explanation = await explainViolation(body.violation);
    return NextResponse.json({ explanation });
  } catch (error) {
    console.error(
      "[A11yFix] /api/explain-violation error:",
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json(
      { error: "AI explanation is unavailable. The accessibility scan results remain available." },
      { status: 500 }
    );
  }
}
