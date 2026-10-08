"use client";

import { useState } from "react";
import { toast } from "sonner";
import BeforeAfterPanel from "@/components/BeforeAfterPanel";
import CertificatePanel from "@/components/CertificatePanel";
import DiffViewer from "@/components/DiffViewer";
import { isFix, isVerifyResult, isViolation } from "@/types";
import type { Certificate, Fix, VerifyResult, Violation } from "@/types";
import type { CrawledPage } from "@/lib/crawler";

interface RepairPreview {
  url: string;
  html: string;
  fixedHtml: string;
  violations: Violation[];
  fixes: Fix[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function postJson(path: string, payload: unknown, operation: string): Promise<unknown> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRecord(body) && typeof body.error === "string"
      ? body.error
      : `${operation} failed. Please try again.`;
    throw new Error(message);
  }
  return body;
}

export default function WebsiteRepairPanel({ pages }: { pages: CrawledPage[] }) {
  const [selectedUrl, setSelectedUrl] = useState(pages[0]?.url ?? "");
  const [preview, setPreview] = useState<RepairPreview | null>(null);
  const [verification, setVerification] = useState<VerifyResult | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [saved, setSaved] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [applying, setApplying] = useState(false);

  async function prepareRepair() {
    if (!selectedUrl) return;
    setPreparing(true);
    setPreview(null);
    setVerification(null);
    setCertificate(null);
    setSaved(false);
    try {
      const scan = await postJson("/api/scan", {
        url: selectedUrl,
        includeHtmlSnapshot: true,
      }, "Page scan");
      if (
        !isRecord(scan) ||
        typeof scan.htmlSnapshot !== "string" ||
        !Array.isArray(scan.violations) ||
        !scan.violations.every(isViolation)
      ) {
        throw new Error("The rendered page snapshot was unavailable for repair preview.");
      }

      const fixesBody = await postJson("/api/fix", {
        html: scan.htmlSnapshot,
        violations: scan.violations,
      }, "Repair preview");
      if (
        !isRecord(fixesBody) ||
        typeof fixesBody.fixedHtml !== "string" ||
        !Array.isArray(fixesBody.fixes) ||
        !fixesBody.fixes.every(isFix)
      ) {
        throw new Error("The repair engine returned an invalid preview.");
      }
      const before = scan.violations;
      const fixes = fixesBody.fixes;
      setPreview({
        url: typeof scan.finalUrl === "string" ? scan.finalUrl : selectedUrl,
        html: scan.htmlSnapshot,
        fixedHtml: fixesBody.fixedHtml,
        violations: before,
        fixes,
      });
      if (fixes.length === 0) {
        toast("No safe deterministic repair was available. Findings remain for manual review.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not prepare a repair preview.");
    } finally {
      setPreparing(false);
    }
  }

  async function applyAndVerify() {
    if (!preview || preview.fixes.length === 0) return;
    setApplying(true);
    setVerification(null);
    setCertificate(null);
    try {
      const result = await postJson("/api/verify", {
        originalHtml: preview.html,
        fixedHtml: preview.fixedHtml,
        originalViolations: preview.violations,
        fixes: preview.fixes,
      }, "Repair verification");
      if (!isVerifyResult(result)) {
        throw new Error("Verification returned an invalid result.");
      }
      const verified: VerifyResult = result;
      setVerification(verified);

      const certificateBody = await postJson("/api/certify", {
        inputHtml: preview.html,
        fixedHtml: preview.fixedHtml,
        before: preview.violations,
        after: verified.remaining,
        fixes: preview.fixes,
        verify: verified,
      }, "Certificate generation");
      if (
        !isRecord(certificateBody) ||
        !isRecord(certificateBody.certificate) ||
        typeof certificateBody.certificate.id !== "string" ||
        typeof certificateBody.certificate.status !== "string" ||
        typeof certificateBody.saved !== "boolean"
      ) {
        throw new Error("Verification completed, but a certificate could not be generated.");
      }
      setCertificate(certificateBody.certificate as unknown as Certificate);
      setSaved(certificateBody.saved === true);
      if (verified.regressions.length > 0) {
        toast.error(`Repair verification failed: ${verified.regressions.length} regression(s) detected.`);
      } else if (verified.resolved > 0) {
        toast.success("Repair re-scanned and verified.");
      } else {
        toast("Repair was applied to the local snapshot, but verification did not confirm a resolution.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not verify this repair.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <section className="space-y-4 border-t border-[var(--border)] pt-5">
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Repair and verification</h3>
        <p className="mt-1 text-xs leading-relaxed text-[var(--foreground-muted)]">
          Repairs are previewed against a rendered page snapshot. Applying changes affects this local snapshot only; A11yFix never writes to the remote website.
        </p>
      </div>
      {pages.length === 0 ? (
        <p role="status" className="border border-[var(--warning)]/25 bg-[var(--warning-surface)] p-3 text-xs leading-relaxed text-[var(--foreground)]">
          No page was successfully scanned, so a repair preview is unavailable. Retry the website scan after checking that the URL is reachable.
        </p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="min-w-0 flex-1 text-xs font-medium text-[var(--foreground-muted)]">
            Page to repair
            <select
              value={selectedUrl}
              onChange={(event) => setSelectedUrl(event.target.value)}
              className="mt-1 min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface-inset)] px-3 text-sm text-[var(--foreground)]"
            >
              {pages.map((page) => (
                <option key={page.url} value={page.url}>{page.title || page.url}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void prepareRepair()}
            disabled={preparing || applying}
            className="self-end inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {preparing ? "Preparing preview..." : "Generate repair preview"}
          </button>
        </div>
      )}

      {preview ? (
        <div className="space-y-4">
          <div className="border border-[var(--border)] bg-[var(--surface-inset)] p-3 text-sm">
            <p className="font-medium text-[var(--foreground)]">{preview.fixes.length ? `${preview.fixes.length} safe repair(s) ready to review` : "No safe automatic repairs available"}</p>
            {preview.fixes.length ? (
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-[var(--foreground-muted)]">
                {preview.fixes.map((fix, index) => <li key={`${fix.violationId}-${index}`}>{fix.note}</li>)}
              </ul>
            ) : <p className="mt-1 text-xs text-[var(--foreground-muted)]">The detected issues require manual repair; no guessed content was inserted.</p>}
            <p className="mt-2 break-all text-xs text-[var(--foreground-subtle)]">Rendered from {preview.url}</p>
          </div>
          {preview.fixes.length > 0 ? (
            <>
              {verification ? (
                <BeforeAfterPanel
                  before={preview.violations}
                  after={[...verification.remaining, ...verification.regressions]}
                  fixes={preview.fixes}
                  originalHtml={preview.html}
                  fixedHtml={preview.fixedHtml}
                  verified
                />
              ) : (
                <DiffViewer before={preview.html} after={preview.fixedHtml} />
              )}
              {!verification ? (
                <button
                  type="button"
                  onClick={() => void applyAndVerify()}
                  disabled={applying}
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {applying ? "Re-scanning and verifying..." : "Apply to snapshot and verify"}
                </button>
              ) : (
                <div className="border border-[var(--border)] bg-[var(--surface-inset)] p-3 text-sm">
                  <p className="font-semibold text-[var(--foreground)]">{verification.regressions.length ? "Repair verification failed" : verification.resolved ? "Repair verification complete" : "Repair not confirmed"}</p>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">Resolved: {verification.resolved} · Remaining: {verification.remaining.length} · Regressions: {verification.regressions.length}</p>
                </div>
              )}
              <CertificatePanel certificate={certificate} saved={saved} loading={applying && Boolean(verification)} />
              {certificate && !saved ? <p role="status" className="text-xs text-[var(--warning)]">Certificate generated locally; history could not be saved.</p> : null}
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
