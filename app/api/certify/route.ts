import { NextResponse } from "next/server";
import { buildCertificate } from "@/lib/certificate";
import { saveCertificate } from "@/lib/supabase";
import { verifyFixes } from "@/lib/verifier";
import { isFix, isVerifyResult, isViolation } from "@/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();

    if (
      !isRecord(body) ||
      typeof body.inputHtml !== "string" ||
      !Array.isArray(body.before) ||
      !body.before.every(isViolation) ||
      !Array.isArray(body.after) ||
      !body.after.every(isViolation) ||
      !Array.isArray(body.fixes) ||
      !body.fixes.every(isFix) ||
      !isVerifyResult(body.verify) ||
      (body.fixes.length > 0 && typeof body.fixedHtml !== "string")
    ) {
      return NextResponse.json(
        { error: "Provide scan findings and verification results to generate a certificate." },
        { status: 400 }
      );
    }

    const before = body.before.filter(isViolation);
    const fixes = body.fixes.filter(isFix);
    const verification = fixes.length > 0
      ? await verifyFixes(body.fixedHtml as string, before)
      : body.verify;
    const after = fixes.length > 0
      ? verification.remaining
      : body.after.filter(isViolation);

    const certificate = buildCertificate(
      body.inputHtml,
      before,
      after,
      fixes,
      verification,
    );

    let saved = false;
    try {
      saved = await saveCertificate(certificate);
    } catch (error) {
      console.error(
        "[A11yFix] Certificate could not be saved:",
        error instanceof Error ? error.message : String(error)
      );
    }

    return NextResponse.json({ certificate, saved });
  } catch (err) {
    console.error(
      "[A11yFix] /api/certify error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { error: "A verification certificate could not be generated. The scan results remain available." },
      { status: 500 }
    );
  }
}