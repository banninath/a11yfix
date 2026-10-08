import { NextResponse } from "next/server";
import { generateAltText } from "@/lib/gemini";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    if (!isRecord(body) || typeof body.src !== "string" || !body.src.trim()) {
      return NextResponse.json(
        { error: "src required" },
        { status: 400 }
      );
    }

    const alt = await generateAltText(body.src);
    return NextResponse.json({ alt });
  } catch (err) {
    console.error(
      "[A11yFix] /api/alt-text error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { error: "AI alt-text is unavailable. The accessibility scan can still be used." },
      { status: 500 }
    );
  }
}