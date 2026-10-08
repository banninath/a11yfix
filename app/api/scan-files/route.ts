import { NextResponse } from "next/server";
import { scanFiles } from "@/lib/zipScanner";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (
      !isRecord(body) ||
      !Array.isArray(body.files) ||
      body.files.length === 0 ||
      !body.files.every(
        (file: unknown) =>
          isRecord(file) &&
          typeof file.filename === "string" &&
          file.filename.trim().length > 0 &&
          typeof file.html === "string" &&
          file.html.trim().length > 0
      )
    ) {
      return NextResponse.json({ error: "Invalid files payload" }, { status: 400 });
    }

    const result = await scanFiles(body.files);
    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "[A11yFix] /api/scan-files error:",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      {
        error: "The selected HTML files could not be analyzed. Check the files and try again.",
      },
      { status: 500 }
    );
  }
}
