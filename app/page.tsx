"use client";

import { Fragment, useState } from "react";
import { toast } from "sonner";
import BeforeAfterPanel from "@/components/BeforeAfterPanel";
import CertificatePanel from "@/components/CertificatePanel";
import InputPanel from "@/components/InputPanel";
import SiteAuditPanel from "@/components/SiteAuditPanel";
import WebsiteAuditReport from "@/components/WebsiteAuditReport";
import WebsiteRepairPanel from "@/components/WebsiteRepairPanel";
import ProgressStepper, {
  type PipelineStageKey,
} from "@/components/ProgressStepper";
import {
  isFix,
  isViolation,
  type Certificate,
  type Fix,
  type StageStatus,
  type SiteAudit,
  type VerifyResult,
  type Violation,
} from "@/types";
import type { MultiFileScanResult } from "@/lib/zipScanner";
import type { CrawlResult } from "@/lib/crawler";
import ViolationCard from "@/components/ViolationCard";

type PipelinePayload = {
  html?: string;
  url?: string;
  mode?: "scan" | "files";
  files?: Array<{ filename: string; html: string }>;
  crawl?: boolean;
};

type CrawlScanResult = CrawlResult;

interface CrawlResultsPanelProps {
  result: CrawlScanResult;
  certificate: Certificate | null;
  saved: boolean;
  certifying: boolean;
  onReset: () => void;
  onGenerateCertificate: () => void;
}

const stageKeys: PipelineStageKey[] = ["scan", "fix", "verify", "certify"];
const initialStageState = (): Record<PipelineStageKey, StageStatus> => ({
  scan: "pending",
  fix: "pending",
  verify: "pending",
  certify: "pending",
});
const initialStageMessages = (): Record<PipelineStageKey, string> => ({
  scan: "",
  fix: "",
  verify: "",
  certify: "",
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSiteAudit(value: unknown): value is SiteAudit {
  const categories: string[] = [
    "metadata",
    "language",
    "sharing",
    "structure",
    "links",
    "performance",
  ];
  const statuses: string[] = ["pass", "warn", "fail"];

  return (
    isRecord(value) &&
    typeof value.url === "string" &&
    typeof value.checkedAt === "string" &&
    typeof value.score === "number" &&
    Number.isFinite(value.score) &&
    value.score >= 0 &&
    value.score <= 100 &&
    typeof value.passedCount === "number" &&
    Number.isInteger(value.passedCount) &&
    typeof value.warnCount === "number" &&
    Number.isInteger(value.warnCount) &&
    typeof value.failCount === "number" &&
    Number.isInteger(value.failCount) &&
    Array.isArray(value.checks) &&
    value.checks.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        typeof item.category === "string" &&
        categories.includes(item.category) &&
        typeof item.label === "string" &&
        typeof item.status === "string" &&
        statuses.includes(item.status) &&
        typeof item.message === "string" &&
        (item.value === undefined || typeof item.value === "string") &&
        (item.suggestion === undefined ||
          typeof item.suggestion === "string"),
    )
  );
}

function isMultiFileScanResult(value: unknown): value is MultiFileScanResult {
  return (
    isRecord(value) &&
    Array.isArray(value.files) &&
    value.files.every(
      (file) =>
        isRecord(file) &&
        typeof file.filename === "string" &&
        typeof file.score === "number" &&
        Number.isFinite(file.score) &&
        Array.isArray(file.violations) &&
        file.violations.every(isViolation)
    ) &&
    typeof value.totalViolations === "number" &&
    Number.isInteger(value.totalViolations) &&
    value.totalViolations >= 0 &&
    typeof value.averageScore === "number" &&
    Number.isFinite(value.averageScore) &&
    typeof value.worstFile === "string"
  );
}

function isCrawlScanResult(value: unknown): value is CrawlScanResult {
  return (
    isRecord(value) &&
    typeof value.startingUrl === "string" &&
    (value.status === "complete" || value.status === "partial" || value.status === "failed") &&
    typeof value.scannedAt === "string" &&
    typeof value.durationMs === "number" &&
    typeof value.pageLimit === "number" &&
    typeof value.discoveredPagesCount === "number" &&
    typeof value.limitReached === "boolean" &&
    Array.isArray(value.pages) &&
    value.pages.every(
      (page) =>
        isRecord(page) &&
        typeof page.url === "string" &&
        typeof page.title === "string" &&
        typeof page.httpStatus === "number" &&
        typeof page.loadTimeMs === "number" &&
        typeof page.score === "number" &&
        Number.isFinite(page.score) &&
        isRecord(page.metadata) &&
        isRecord(page.structure) &&
        Array.isArray(page.rules) &&
        page.rules.every(
          (rule) =>
            isRecord(rule) &&
            typeof rule.id === "string" &&
            (rule.status === "passed" || rule.status === "failed" || rule.status === "incomplete") &&
            Array.isArray(rule.nodes),
        ) &&
        Array.isArray(page.violations) &&
        page.violations.every(isViolation) &&
        Array.isArray(page.links)
    ) &&
    Array.isArray(value.failedPages) &&
    value.failedPages.every((page) =>
      isRecord(page) &&
      typeof page.url === "string" &&
      typeof page.error === "string" &&
      typeof page.timedOut === "boolean"
    ) &&
    Array.isArray(value.links) &&
    (value.metadata === null || isRecord(value.metadata)) &&
    typeof value.totalViolations === "number" &&
    Number.isInteger(value.totalViolations) &&
    value.totalViolations >= 0 &&
    typeof value.totalPassedRules === "number" &&
    typeof value.totalIncompleteChecks === "number" &&
    typeof value.pagesWithViolations === "number" &&
    typeof value.averageScore === "number" &&
    Number.isFinite(value.averageScore)
  );
}

function CrawlResultsPanel({
  result,
  certificate,
  saved,
  certifying,
  onReset,
  onGenerateCertificate,
}: CrawlResultsPanelProps) {
  return (
    <section className="space-y-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <div className="mb-2 flex items-center gap-1.5" aria-hidden="true">
            <span className="h-1 w-3 rounded-sm bg-[var(--accent)]" />
            <span className="h-1 w-3 rounded-sm bg-[var(--accent)]/60" />
            <span className="h-1 w-3 rounded-sm bg-[var(--accent)]/30" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Website audit report
          </h2>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-10 items-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors duration-150 ease-out hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
        >
          Reset
        </button>
      </header>

      <WebsiteAuditReport result={result} />
      <WebsiteRepairPanel pages={result.pages} />

      <button
        type="button"
        onClick={onGenerateCertificate}
        disabled={certifying}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] transition-[background-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] sm:w-auto"
      >
        {certifying
          ? "Generating certificate..."
          : "Generate audit record"}
      </button>
      <CertificatePanel
        certificate={certificate}
        saved={saved}
        loading={certifying}
      />
    </section>
  );
}

function isVerifyResult(value: unknown): value is VerifyResult {
  return (
    isRecord(value) &&
    typeof value.resolved === "number" &&
    Number.isInteger(value.resolved) &&
    value.resolved >= 0 &&
    Array.isArray(value.remaining) &&
    value.remaining.every(isViolation) &&
    Array.isArray(value.regressions) &&
    value.regressions.every(isViolation)
  );
}

function isCertificate(value: unknown): value is Certificate {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.inputHash === "string" &&
    typeof value.inputSnippet === "string" &&
    Array.isArray(value.violationsBefore) &&
    value.violationsBefore.every(isViolation) &&
    Array.isArray(value.violationsAfter) &&
    value.violationsAfter.every(isViolation) &&
    Array.isArray(value.fixesApplied) &&
    value.fixesApplied.every(isFix) &&
    Array.isArray(value.regressions) &&
    value.regressions.every(isViolation) &&
    (value.status === "verified" ||
      value.status === "partial" ||
      value.status === "failed") &&
    typeof value.summary === "string" &&
    typeof value.beforeScore === "number" &&
    typeof value.afterScore === "number"
  );
}

async function requireSuccessfulResponse(
  response: Response,
  stage: string
): Promise<unknown> {
  if (response.ok) {
    return response.json() as Promise<unknown>;
  }

  let message = "Please retry the operation.";
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.error === "string") {
      message = body.error;
    }
  } catch {
    message = "Please retry the operation.";
  }

  throw new Error(`${stage} failed. ${message}`);
}

export default function Home() {
  const [running, setRunning] = useState(false);
  const [stageStatus, setStageStatus] =
    useState<Record<PipelineStageKey, StageStatus>>(initialStageState);
  const [stageMsg, setStageMsg] =
    useState<Record<PipelineStageKey, string>>(initialStageMessages);
  const [before, setBefore] = useState<Violation[]>([]);
  const [after, setAfter] = useState<Violation[]>([]);
  const [fixes, setFixes] = useState<Fix[]>([]);
  const [originalHtml, setOriginalHtml] = useState("");
  const [fixedHtml, setFixedHtml] = useState<string | null>(null);
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [saved, setSaved] = useState(false);
  const [multiResult, setMultiResult] = useState<MultiFileScanResult | null>(null);
  const [multiLoading, setMultiLoading] = useState(false);
  const [multiCertifying, setMultiCertifying] = useState(false);
  const [expandedFilename, setExpandedFilename] = useState<string | null>(null);
  const [crawlResult, setCrawlResult] = useState<CrawlScanResult | null>(null);
  const [crawlStartUrl, setCrawlStartUrl] = useState("");
  const [crawlLoading, setCrawlLoading] = useState(false);
  const [crawlCertifying, setCrawlCertifying] = useState(false);
  const [siteAudit, setSiteAudit] = useState<SiteAudit | null>(null);
  const [siteAuditLoading, setSiteAuditLoading] = useState(false);

  function setStage(
    key: PipelineStageKey,
    status: StageStatus,
    message: string
  ) {
    setStageStatus((current) => ({ ...current, [key]: status }));
    setStageMsg((current) => ({ ...current, [key]: message }));
  }

  async function runPipeline(payload: PipelinePayload) {
    if (payload.url?.trim()) {
      try {
        const rawUrl = payload.url.trim();
        const normalizedInput = /^[a-z][a-z\d+.-]*:\/\//i.test(rawUrl)
          ? rawUrl
          : `https://${rawUrl}`;
        const parsedUrl = new URL(normalizedInput);
        if (
          (parsedUrl.protocol !== "http:" &&
            parsedUrl.protocol !== "https:") ||
          !parsedUrl.hostname
        ) {
          toast.error("Invalid URL");
          return;
        }
        payload = { ...payload, url: parsedUrl.toString() };
      } catch {
        toast.error("Invalid website URL. Enter a valid HTTP or HTTPS address.");
        return;
      }
    }

    if (payload.mode === "files") {
      if (!payload.files?.length) {
        toast.error("Choose at least one HTML file to scan");
        return;
      }

      setSiteAudit(null);
      setSiteAuditLoading(false);
      setCrawlResult(null);
      setMultiResult(null);
      setCertificate(null);
      setSaved(false);
      setExpandedFilename(null);
      setMultiLoading(true);
      try {
        const response = await fetch("/api/scan-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: payload.files }),
        });
        const body = await requireSuccessfulResponse(response, "Multi-file scan");
        if (!isMultiFileScanResult(body)) {
          throw new Error("Multi-file scan returned an invalid response");
        }
        setMultiResult(body);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Multi-file scan failed"
        );
      } finally {
        setMultiLoading(false);
      }
      return;
    }

    if (
      payload.crawl === true &&
      typeof payload.url === "string" &&
      payload.url.trim()
    ) {
      setSiteAudit(null);
      setSiteAuditLoading(false);
      setMultiResult(null);
      setCrawlResult(null);
      setCertificate(null);
      setSaved(false);
      setBefore([]);
      setAfter([]);
      setFixes([]);
      setOriginalHtml("");
      setFixedHtml(null);
      setVerify(null);
      setStageStatus(initialStageState());
      setStageMsg(initialStageMessages());
      setCrawlStartUrl(payload.url);
      setCrawlLoading(true);
      setSiteAuditLoading(true);
      try {
        const response = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: payload.url,
            crawl: true,
          }),
        });
        const body = await requireSuccessfulResponse(response, "Crawl");
        if (!isCrawlScanResult(body)) {
          throw new Error("Crawl returned an invalid response");
        }
        setCrawlResult(body);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not crawl this domain"
        );
      } finally {
        setCrawlLoading(false);
        setSiteAuditLoading(false);
      }
      return;
    }

    setSiteAudit(null);
    setSiteAuditLoading(Boolean(payload.url?.trim()));
    setCrawlResult(null);
    setMultiResult(null);
    setRunning(true);
    setStageStatus(initialStageState());
    setStageMsg(initialStageMessages());
    setBefore([]);
    setAfter([]);
    setFixes([]);
    setOriginalHtml("");
    setFixedHtml(null);
    setVerify(null);
    setCertificate(null);
    setSaved(false);

    let activeStage: PipelineStageKey = "scan";

    try {
      let inputHtml = payload.html ?? "";
      let violations: Violation[] = [];
      if (typeof payload.url === "string" && payload.url.trim()) {
        setStage(activeStage, "running", "Validating URL and loading the rendered page...");
        const scanResponse = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: payload.url, includeHtmlSnapshot: true }),
        });
        const scanBody = await requireSuccessfulResponse(scanResponse, "Website scan");
        if (
          !isRecord(scanBody) ||
          typeof scanBody.htmlSnapshot !== "string" ||
          !Array.isArray(scanBody.violations) ||
          !scanBody.violations.every(isViolation) ||
          !isSiteAudit(scanBody.audit)
        ) {
          throw new Error("The browser scan did not return a repairable page snapshot.");
        }
        inputHtml = scanBody.htmlSnapshot;
        violations = scanBody.violations;
        setSiteAudit(scanBody.audit);
        setSiteAuditLoading(false);
        setStage(activeStage, "done", `Rendered page scanned; found ${scanBody.violations.length} violation(s)`);
      }
      setOriginalHtml(inputHtml);

      if (!payload.url?.trim()) {
        setStage(activeStage, "running", "Scanning supplied HTML with axe-core...");
        const scanResponse = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ html: inputHtml }),
        });
        const scanBody = await requireSuccessfulResponse(scanResponse, "HTML scan");
        if (!isRecord(scanBody) || !Array.isArray(scanBody.violations) || !scanBody.violations.every(isViolation)) {
          throw new Error("HTML scan returned an invalid result.");
        }
        violations = scanBody.violations;
      }

      setBefore(violations);
      setStage(activeStage, "done", `Found ${violations.length} violations`);

      let fixedHtml = inputHtml;
      let appliedFixes: Fix[] = [];

      activeStage = "fix";
      setStage(activeStage, "running", "Applying automatic fixes...");
      const fixResponse = await fetch("/api/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: inputHtml,
          violations,
        }),
      });
      const fixBody = await requireSuccessfulResponse(fixResponse, "Fix");
      if (
        !isRecord(fixBody) ||
        typeof fixBody.fixedHtml !== "string" ||
        !Array.isArray(fixBody.fixes) ||
        !fixBody.fixes.every(isFix)
      ) {
        throw new Error("Fix returned an invalid response");
      }

      fixedHtml = fixBody.fixedHtml;
      setFixedHtml(fixedHtml);
      appliedFixes = fixBody.fixes.filter(isFix);
      setFixes(appliedFixes);
      setStage(activeStage, "done", `Applied ${appliedFixes.length} fixes`);

      activeStage = "verify";
      setStage(activeStage, "running", "Re-scanning to verify...");
      const verifyResponse = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalHtml: inputHtml,
          fixedHtml,
          originalViolations: violations,
          fixes: appliedFixes,
        }),
      });
      const verifyBody = await requireSuccessfulResponse(
        verifyResponse,
        "Verify"
      );
      if (!isVerifyResult(verifyBody)) {
        throw new Error("Verify returned an invalid response");
      }

      const verifyResult = verifyBody;
      const remainingViolations = verifyResult.remaining;
      setVerify(verifyResult);
      setAfter([...remainingViolations, ...verifyResult.regressions]);
      setStage(
        activeStage,
        "done",
        `${verifyResult.resolved} resolved, ${remainingViolations.length} remaining, ${verifyResult.regressions.length} regressions`
      );

      setVerify(verifyResult);
      setAfter([...remainingViolations, ...verifyResult.regressions]);

      activeStage = "certify";
      setStage(activeStage, "running", "Building certificate...");
      const certifyResponse = await fetch("/api/certify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputHtml,
          fixedHtml,
          before: violations,
          after: remainingViolations,
          fixes: appliedFixes,
          verify: verifyResult,
        }),
      });
      const certifyBody = await requireSuccessfulResponse(
        certifyResponse,
        "Certify"
      );
      if (
        !isRecord(certifyBody) ||
        !isCertificate(certifyBody.certificate) ||
        typeof certifyBody.saved !== "boolean"
      ) {
        throw new Error("Certify returned an invalid response");
      }

      setCertificate(certifyBody.certificate);
      setSaved(certifyBody.saved);
      setStage(
        activeStage,
        certifyBody.certificate.status === "failed" ? "failed" : "done",
        certifyBody.certificate.status === "verified"
          ? certifyBody.saved ? "Repair verified and saved to history" : "Repair verified; history save unavailable"
          : certifyBody.certificate.summary,
      );
      if (certifyBody.certificate.status === "verified") {
        toast.success(
          certifyBody.saved
            ? "Repair verified and certificate saved to history."
            : "Repair verified; certificate generated locally but could not be saved to history.",
        );
      } else if (certifyBody.certificate.status === "failed") {
        toast.error("Repair verification failed. Review the reported regressions.");
      } else {
        toast("Workflow completed with unresolved findings; no verified-repair claim was made.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Pipeline failed";
      setStage(activeStage, "failed", message);
      toast.error(message);
    } finally {
      setRunning(false);
      setSiteAuditLoading(false);
    }
  }

  async function generateSiteCertificate() {
    if (!multiResult) {
      return;
    }

    const before = multiResult.files.flatMap((file) => file.violations);
    const inputHtml = `Multi-file site scan\nFiles: ${multiResult.files
      .map((file) => file.filename)
      .join(", ")}`;

    setMultiCertifying(true);
    try {
      const response = await fetch("/api/certify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputHtml,
          before,
          after: before,
          fixes: [],
          verify: { resolved: 0, remaining: before, regressions: [] },
        }),
      });
      const body = await requireSuccessfulResponse(response, "Certify");
      if (
        !isRecord(body) ||
        !isCertificate(body.certificate) ||
        typeof body.saved !== "boolean"
      ) {
        throw new Error("Certify returned an invalid response");
      }
      setCertificate(body.certificate);
      setSaved(body.saved);
      toast.success("Audit record generated; no repairs were applied");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not generate certificate"
      );
    } finally {
      setMultiCertifying(false);
    }
  }

  async function generateCrawlCertificate() {
    if (!crawlResult) {
      return;
    }

    const before = crawlResult.pages.flatMap((page) => page.violations);
    setCrawlCertifying(true);
    try {
      const response = await fetch("/api/certify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputHtml: crawlStartUrl,
          before,
          after: before,
          fixes: [],
          verify: { resolved: 0, remaining: before, regressions: [] },
        }),
      });
      const body = await requireSuccessfulResponse(response, "Certify");
      if (
        !isRecord(body) ||
        !isCertificate(body.certificate) ||
        typeof body.saved !== "boolean"
      ) {
        throw new Error("Certify returned an invalid response");
      }
      setCertificate(body.certificate);
      setSaved(body.saved);
      toast.success("Audit record generated; the live website was not changed");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not generate certificate"
      );
    } finally {
      setCrawlCertifying(false);
    }
  }

  function resetCrawlResults() {
    setCrawlResult(null);
    setCrawlStartUrl("");
    setCertificate(null);
    setSaved(false);
    setSiteAuditLoading(false);
  }

  function resetMultiFileResults() {
    setMultiResult(null);
    setCertificate(null);
    setSaved(false);
    setExpandedFilename(null);
  }

  return (
    <div className="mx-auto w-full max-w-[1248px] space-y-8 px-4 py-8 sm:px-6 sm:py-10 md:px-8">
      <header className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-6 sm:px-6 sm:py-8 md:px-8">
        <div
          aria-hidden="true"
          className="mb-5 flex items-center gap-1.5"
        >
          <span className="h-1 w-5 rounded-sm bg-[var(--accent)]" />
          <span className="h-1 w-5 rounded-sm bg-[var(--accent)]/60" />
          <span className="h-1 w-5 rounded-sm bg-[var(--accent)]/30" />
        </div>
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold leading-tight tracking-[-0.04em] text-[var(--foreground)] sm:text-4xl">
            Automated Accessibility Audit & Repair
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--foreground-muted)] sm:text-base">
            Scan a website in a real browser, review WCAG findings and evidence, then use the HTML repair workflow to verify proposed changes.
          </p>
        </div>
      </header>

      <>
          <InputPanel
            onSubmit={runPipeline}
            loading={running || multiLoading || crawlLoading}
          />

          {multiLoading || crawlLoading ? (
            <div
              role="status"
              aria-label={crawlLoading ? "Crawling pages" : "Scanning uploaded files"}
              className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6"
            >
              <p className="text-sm font-medium text-[var(--foreground)]">
                {crawlLoading
                  ? "Launching a browser, discovering same-site links, and running axe-core checks..."
                  : "Scanning uploaded files..."}
              </p>
              <div className="h-5 w-48 animate-pulse rounded-sm bg-[var(--surface-raised)]" />
              <div className="h-16 animate-pulse rounded-lg bg-[var(--surface-inset)]" />
              <div className="h-28 animate-pulse rounded-lg bg-[var(--surface-inset)]" />
            </div>
          ) : multiResult ? (
            <section className="space-y-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6 md:p-8">
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
                <div>
                  <div className="mb-2 flex items-center gap-1.5" aria-hidden="true">
                    <span className="h-1 w-3 rounded-sm bg-[var(--accent)]" />
                    <span className="h-1 w-3 rounded-sm bg-[var(--accent)]/60" />
                    <span className="h-1 w-3 rounded-sm bg-[var(--accent)]/30" />
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                    Multi-File Results
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={resetMultiFileResults}
                  className="inline-flex min-h-10 items-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors duration-150 ease-out hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
                >
                  Reset
                </button>
              </header>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: "Total files", value: multiResult.files.length },
                  {
                    label: "Total violations",
                    value: multiResult.totalViolations,
                  },
                  { label: "Average score", value: multiResult.averageScore },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] p-4"
                  >
                    <p className="text-xs font-medium text-[var(--foreground-muted)]">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] tabular-nums">
                      {stat.value}
                      {stat.label === "Average score" ? "/100" : ""}
                    </p>
                  </div>
                ))}
              </div>

              <p className="rounded-lg border border-[var(--warning)]/25 bg-[var(--warning-surface)] px-4 py-3 text-sm text-[var(--foreground)]">
                Worst file:{" "}
                <span className="font-semibold">{multiResult.worstFile}</span>{" "}
                with score{" "}
                <span className="font-semibold tabular-nums">
                  {multiResult.files.find(
                    (file) => file.filename === multiResult.worstFile
                  )?.score ?? 0}
                </span>
              </p>

              <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                <table className="hidden w-full text-left text-sm sm:table">
                  <thead className="bg-[var(--surface-raised)] text-xs uppercase tracking-wide text-[var(--foreground-muted)]">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Filename</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Violations</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Score</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {multiResult.files.map((file, index) => {
                      const expanded = expandedFilename === `${file.filename}-${index}`;
                      return (
                        <Fragment key={`${file.filename}-${index}`}>
                          <tr className="transition-colors duration-150 ease-out hover:bg-[var(--surface-raised)]">
                            <td className="px-4 py-3 font-mono text-xs text-[var(--foreground)]">
                              <button
                                type="button"
                                aria-expanded={expanded}
                                onClick={() =>
                                  setExpandedFilename(
                                    expanded ? null : `${file.filename}-${index}`
                                  )
                                }
                                className="text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                              >
                                {file.filename}
                              </button>
                            </td>
                            <td className="px-4 py-3 tabular-nums">{file.violations.length}</td>
                            <td className="px-4 py-3 font-semibold tabular-nums">{file.score}</td>
                            <td className="px-4 py-3 text-xs text-[var(--foreground-muted)]">
                              {file.score >= 90 ? "Strong" : file.score >= 70 ? "Needs review" : "Critical"}
                            </td>
                          </tr>
                          {expanded && (
                            <tr>
                              <td colSpan={4} className="bg-[var(--surface-inset)] p-4">
                                <div className="space-y-3">
                                {file.violations.length > 0 ? (
                                  file.violations.map((violation) => (
                                    <ViolationCard key={violation.id} violation={violation} />
                                  ))
                                ) : (
                                  <p className="text-sm text-[var(--foreground-muted)]">No violations found in this file.</p>
                                )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                <ul className="divide-y divide-[var(--border)] sm:hidden">
                  {multiResult.files.map((file, index) => {
                    const fileKey = `${file.filename}-${index}`;
                    const expanded = expandedFilename === fileKey;
                    return (
                      <li key={fileKey} className="p-3">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() =>
                            setExpandedFilename(expanded ? null : fileKey)
                          }
                          className="w-full space-y-3 rounded-lg p-2 text-left transition-colors duration-150 ease-out hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                        >
                          <span className="block break-all font-mono text-xs text-[var(--foreground)]">
                            {file.filename}
                          </span>
                          <span className="grid grid-cols-3 gap-2 text-xs">
                            <span className="text-[var(--foreground-muted)]">
                              Violations: <b className="tabular-nums text-[var(--foreground)]">{file.violations.length}</b>
                            </span>
                            <span className="text-[var(--foreground-muted)]">
                              Score: <b className="tabular-nums text-[var(--foreground)]">{file.score}</b>
                            </span>
                            <span className="text-[var(--foreground-muted)]">
                              {file.score >= 90 ? "Strong" : file.score >= 70 ? "Review" : "Critical"}
                            </span>
                          </span>
                        </button>
                        {expanded && (
                          <div className="mt-3 space-y-3">
                            {file.violations.length > 0 ? (
                              file.violations.map((violation) => (
                                <ViolationCard key={violation.id} violation={violation} />
                              ))
                            ) : (
                              <p className="text-sm text-[var(--foreground-muted)]">No violations found in this file.</p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => void generateSiteCertificate()}
                disabled={multiCertifying}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] transition-[background-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] sm:w-auto"
              >
                {multiCertifying
                  ? "Generating certificate..."
                  : "Generate audit record"}
              </button>
              <CertificatePanel
                certificate={certificate}
                saved={saved}
                loading={multiCertifying}
              />
            </section>
          ) : crawlResult ? (
            <>
              <CrawlResultsPanel
                result={crawlResult}
                certificate={certificate}
                saved={saved}
                certifying={crawlCertifying}
                onReset={resetCrawlResults}
                onGenerateCertificate={() => void generateCrawlCertificate()}
              />
            </>
          ) : (
            <>
              <ProgressStepper
                stages={stageKeys.map((key) => ({
                  key,
                  label: key[0].toUpperCase() + key.slice(1),
                  status: stageStatus[key],
                  message: stageMsg[key],
                }))}
              />

              {(before.length > 0 || running || verify !== null) && (
                <BeforeAfterPanel
                  before={before}
                  after={after}
                  fixes={fixes}
                  originalHtml={originalHtml}
                  fixedHtml={fixedHtml}
                  loading={running}
                  verified={verify !== null}
                />
              )}

              <CertificatePanel
                certificate={certificate}
                saved={saved}
                loading={running && stageStatus.certify === "running"}
              />

              <SiteAuditPanel
                audit={siteAudit}
                loading={siteAuditLoading}
              />
            </>
          )}
      </>
    </div>
  );
}
