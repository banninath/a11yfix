"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, ExternalLink, Info, Search, ShieldCheck } from "lucide-react";
import type { CrawlResult } from "@/lib/crawler";
import type { AxeRuleResult, ImpactLevel } from "@/types";

const outcomeLabels = {
  all: "All rules",
  passed: "Passed",
  failed: "Failed",
  incomplete: "Manual review",
} as const;

type OutcomeFilter = keyof typeof outcomeLabels;
type LinkFilter = "all" | "working" | "broken" | "empty" | "external" | "not-crawled";

const linkFilters: Array<{ id: LinkFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "working", label: "Working" },
  { id: "broken", label: "Broken" },
  { id: "empty", label: "Empty" },
  { id: "external", label: "External" },
  { id: "not-crawled", label: "Not crawled" },
];

const outcomeStyle = {
  passed: "border-[var(--success)]/25 bg-[var(--success-surface)] text-[var(--success)]",
  failed: "border-[var(--danger)]/25 bg-[var(--danger-surface)] text-[var(--danger)]",
  incomplete: "border-[var(--warning)]/25 bg-[var(--warning-surface)] text-[var(--warning)]",
};

function isWorking(status: number | undefined) {
  return status !== undefined && status >= 200 && status < 400;
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="border-l-2 border-[var(--border-strong)] pl-3">
      <p className="text-xs font-medium text-[var(--foreground-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{value}</p>
      {detail ? <p className="mt-1 text-xs text-[var(--foreground-subtle)]">{detail}</p> : null}
    </div>
  );
}

function MetadataList({ title, entries }: { title: string; entries: Array<[string, string]> }) {
  const available = entries.filter(([, value]) => Boolean(value));
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">{title}</h4>
      {available.length ? (
        <dl className="grid gap-x-5 sm:grid-cols-[minmax(8rem,0.35fr)_1fr]">
          {available.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="border-t border-[var(--border)] py-2 text-xs text-[var(--foreground-muted)]">{label}</dt>
              <dd className="min-w-0 break-words border-t border-[var(--border)] py-2 text-xs text-[var(--foreground)]">{value}</dd>
            </div>
          ))}
        </dl>
      ) : <p className="text-xs text-[var(--foreground-subtle)]">No values detected.</p>}
    </div>
  );
}

function RuleCard({ rule }: { rule: AxeRuleResult }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = rule.status === "passed" ? Check : rule.status === "failed" ? AlertTriangle : Info;
  const nodes = rule.nodes;
  const safeFixCount = nodes.filter((node) => node.fixableType === "missing-alt").length;
  return (
    <article className="overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-start gap-3 p-3 text-left hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset sm:p-4"
      >
        <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${rule.status === "passed" ? "text-[var(--success)]" : rule.status === "failed" ? "text-[var(--danger)]" : "text-[var(--warning)]"}`} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${outcomeStyle[rule.status]}`}>{outcomeLabels[rule.status]}</span>
            <span className="font-mono text-xs text-[var(--foreground-muted)]">{rule.id}</span>
            {rule.wcagCriteria.map((criterion) => (
              <span key={criterion} className="rounded-md border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--foreground-muted)]">WCAG {criterion}</span>
            ))}
            {rule.wcagLevel ? <span className="text-[11px] font-medium text-[var(--foreground-subtle)]">Level {rule.wcagLevel}</span> : null}
          </span>
          <span className="mt-1 block text-sm font-semibold text-[var(--foreground)]">{rule.help}</span>
          <span className="mt-1 block break-all text-xs text-[var(--foreground-muted)]">{rule.pageUrl}</span>
        </span>
        <span className="shrink-0 text-xs tabular-nums text-[var(--foreground-muted)]">{nodes.length} {rule.status === "passed" ? (nodes.length === 1 ? "tested element" : "tested elements") : rule.status === "failed" ? (nodes.length === 1 ? "affected element" : "affected elements") : (nodes.length === 1 ? "review element" : "review elements")}</span>
      </button>
      {expanded ? (
        <div className="space-y-4 border-t border-[var(--border)] bg-[var(--surface-inset)] p-3 sm:p-4">
          <p className="text-sm leading-relaxed text-[var(--foreground)]">{rule.description}</p>
          <div className="border border-[var(--border)] bg-[var(--surface)] p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Suggested repair</h4>
            <p className="mt-1 text-sm leading-relaxed text-[var(--foreground)]">{rule.help}</p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--warning)]">{safeFixCount > 0 ? `${safeFixCount} element(s) have a safe deterministic repair available from existing page text.` : "Manual repair required; generating missing semantic content would require guessing."} A11yFix does not write changes to the remote website.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-md border border-[var(--border)] px-2 py-1 font-mono">axe: {rule.id}</span>
            {rule.impact ? <span className="rounded-md border border-[var(--border)] px-2 py-1 capitalize">Impact: {rule.impact}</span> : null}
            {rule.tags.map((tag) => <span key={tag} className="rounded-md border border-[var(--border)] px-2 py-1 font-mono">{tag}</span>)}
          </div>
          {nodes.length ? (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Captured DOM evidence ({nodes.length})</h4>
              {nodes.map((node, index) => (
                <div key={`${node.selector}-${index}`} className="space-y-2 border border-[var(--border)] bg-[var(--surface)] p-3">
                  <p className="text-xs font-medium text-[var(--foreground-muted)]">Occurrence {index + 1}</p>
                  <p className="break-all font-mono text-xs text-[var(--foreground)]">{node.selector || "Selector unavailable"}</p>
                  <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-[var(--foreground-muted)]">{node.html || "HTML evidence unavailable"}</pre>
                  {node.failureSummary ? <p className="whitespace-pre-line text-xs leading-relaxed text-[var(--danger)]">{node.failureSummary}</p> : null}
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-[var(--foreground-muted)]">The axe rule passed. No failing element evidence was reported.</p>}
          <a href={rule.helpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline">
            {rule.helpUrl ? "Read rule guidance" : "Rule guidance unavailable"}
            {rule.helpUrl ? <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /> : null}
          </a>
        </div>
      ) : null}
    </article>
  );
}

export default function WebsiteAuditReport({ result }: { result: CrawlResult }) {
  const [linkFilter, setLinkFilter] = useState<LinkFilter>("all");
  const [outcome, setOutcome] = useState<OutcomeFilter>("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [impactFilter, setImpactFilter] = useState<"all" | ImpactLevel>("all");
  const [search, setSearch] = useState("");
  const allRules = useMemo(() => result.pages.flatMap((page) => page.rules), [result.pages]);
  const passedCount = allRules.filter((rule) => rule.status === "passed").length;
  const failedCount = allRules.filter((rule) => rule.status === "failed").length;
  const incompleteCount = allRules.filter((rule) => rule.status === "incomplete").length;
  const internalLinks = result.links.filter((link) => link.isInternal);
  const httpErrorPages = result.pages.filter((page) => page.httpStatus >= 400);
  const rules = allRules.filter((rule) => {
    if (outcome !== "all" && rule.status !== outcome) return false;
    if (levelFilter !== "all" && rule.wcagLevel !== levelFilter) return false;
    if (impactFilter !== "all" && rule.impact !== impactFilter) return false;
    const haystack = [rule.id, rule.description, rule.help, rule.pageUrl, ...rule.wcagCriteria, ...rule.nodes.flatMap((node) => [node.selector, node.html])].join(" ").toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });
  const filteredLinks = result.links.filter((link) => {
    if (linkFilter === "all") return true;
    if (linkFilter === "working") return link.crawlStatus === "crawled" && isWorking(link.httpStatus);
    if (linkFilter === "broken") return link.crawlStatus === "failed" || (link.httpStatus !== undefined && link.httpStatus >= 400);
    if (linkFilter === "empty") return link.isEmpty;
    if (linkFilter === "external") return !link.isInternal;
    return link.crawlStatus === "not-crawled";
  });
  const summaryCards = [
    { label: "Pages scanned", value: result.pages.length, detail: `${result.discoveredPagesCount} unique pages discovered` },
    { label: "Internal links", value: new Set(internalLinks.map((link) => link.destinationUrl)).size, detail: `${internalLinks.length} link occurrences` },
    { label: "Pages with violations", value: result.pagesWithViolations, detail: `${result.pages.length - result.pagesWithViolations} with none detected` },
    { label: "Failed pages", value: result.failedPages.length + httpErrorPages.length, detail: `${result.failedPages.filter((page) => page.timedOut).length} timed out · ${httpErrorPages.length} HTTP error` },
    { label: "WCAG violations", value: result.totalViolations, detail: "Affected elements reported by axe" },
    { label: "Passed rules", value: passedCount, detail: "Actual axe pass results across pages" },
    { label: "Manual review", value: incompleteCount, detail: "Incomplete axe results across pages" },
    { label: "Automated score", value: result.pages.length ? `${result.averageScore}/100` : "N/A", detail: "Product metric; not WCAG conformance" },
  ];

  return (
    <div className="space-y-5">
      <section className="space-y-5 border-b border-[var(--border)] pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">Website overview</p>
            <h2 className="mt-1 break-all text-lg font-semibold text-[var(--foreground)]">{result.startingUrl}</h2>
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">{new Date(result.scannedAt).toLocaleString()} · {(result.durationMs / 1000).toFixed(1)} seconds · {result.pages.length} of {result.discoveredPagesCount} discovered URLs analyzed</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${result.status === "complete" ? "border-[var(--success)]/25 bg-[var(--success-surface)] text-[var(--success)]" : result.status === "partial" ? "border-[var(--warning)]/25 bg-[var(--warning-surface)] text-[var(--warning)]" : "border-[var(--danger)]/25 bg-[var(--danger-surface)] text-[var(--danger)]"}`}>
            {result.status === "complete" ? <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" /> : null}
            {result.status === "complete" ? "Scan complete" : result.status === "partial" ? "Partial scan" : "Scan failed"}
          </span>
        </div>
        {result.status === "partial" ? <p role="status" className="border border-[var(--warning)]/25 bg-[var(--warning-surface)] p-3 text-xs leading-relaxed text-[var(--foreground)]">Partial scan: {result.pages.length} page(s) were analyzed{result.failedPages.length ? `; ${result.failedPages.length} could not be analyzed, including ${result.failedPages.filter((page) => page.timedOut).length} timeout(s)` : ""}{httpErrorPages.length ? `; ${httpErrorPages.length} returned HTTP errors` : ""}{result.limitReached ? `; the automatic ${result.pageLimit}-page safety limit was reached with more pages discovered` : ""}. Results do not cover every discovered page.</p> : null}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {summaryCards.map((card) => <Metric key={card.label} {...card} />)}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--foreground-muted)]">
          <span>HTTP status: <b className="text-[var(--foreground)]">{result.pages[0]?.httpStatus || "Unavailable"}</b></span>
          <span>HTTPS: <b className="text-[var(--foreground)]">{result.pages[0] ? new URL(result.pages[0].url).protocol === "https:" ? "Yes" : "No" : "Unavailable"}</b></span>
          <span>Passed: <b className="text-[var(--success)]">{passedCount}</b></span>
          <span>Failed rules: <b className="text-[var(--danger)]">{failedCount}</b></span>
        </div>
      </section>

      <details open className="border-b border-[var(--border)] pb-5">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">Website metadata</summary>
        {result.metadata ? (
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <MetadataList title="Basic" entries={[
              ["Final URL", result.pages[0]?.url ?? ""], ["Page title", result.metadata.title], ["Meta description", result.metadata.description], ["Canonical", result.metadata.canonical], ["Language", result.metadata.language], ["Text direction", result.metadata.direction], ["Charset", result.metadata.charset], ["Viewport", result.metadata.viewport], ["Robots", result.metadata.robots], ["Favicon", result.metadata.favicon],
            ]} />
            <div className="space-y-5">
              <MetadataList title="Open Graph" entries={Object.entries(result.metadata.openGraph)} />
              <MetadataList title="Twitter / X" entries={Object.entries(result.metadata.twitter)} />
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Structured data</h4>
                {result.metadata.structuredData.length ? <ul className="space-y-2">{result.metadata.structuredData.map((item, index) => <li key={`${item.summary}-${index}`} className="border border-[var(--border)] p-3 text-xs"><span className="font-medium text-[var(--foreground)]">{item.summary}</span><p className="mt-1 text-[var(--foreground-muted)]">Presence detected; correctness was not evaluated.</p></li>)}</ul> : <p className="text-xs text-[var(--foreground-subtle)]">No JSON-LD blocks detected.</p>}
              </div>
            </div>
          </div>
        ) : <p className="mt-3 text-sm text-[var(--foreground-muted)]">Metadata is unavailable because the starting page could not be scanned.</p>}
      </details>

      <details className="border-b border-[var(--border)] pb-5">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">Internal links and site structure <span className="ml-2 text-xs font-normal text-[var(--foreground-muted)]">{internalLinks.length} internal · {result.links.length - internalLinks.length} external</span></summary>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-1.5" aria-label="Filter discovered links">
            {linkFilters.map((filter) => <button key={filter.id} type="button" aria-pressed={linkFilter === filter.id} onClick={() => setLinkFilter(filter.id)} className={`min-h-9 rounded-md border px-3 text-xs font-medium ${linkFilter === filter.id ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--surface-raised)]"}`}>{filter.label}</button>)}
          </div>
          <div className="max-h-80 overflow-auto border border-[var(--border)]">
            {filteredLinks.length ? <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-[var(--surface-raised)] text-[var(--foreground-muted)]"><tr><th className="px-3 py-2 font-medium">Destination</th><th className="px-3 py-2 font-medium">Anchor</th><th className="px-3 py-2 font-medium">Source</th><th className="px-3 py-2 font-medium">Status</th></tr></thead><tbody>{filteredLinks.map((link, index) => <tr key={`${link.sourcePage}:${link.destinationUrl}:${index}`} className="border-t border-[var(--border)]"><td className="max-w-64 break-all px-3 py-2"><a href={link.destinationUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)] underline-offset-4 hover:underline">{link.destinationUrl}</a></td><td className="max-w-40 break-words px-3 py-2">{link.anchorText || <span className="text-[var(--danger)]">Empty name</span>}</td><td className="max-w-40 break-all px-3 py-2 text-[var(--foreground-muted)]">{link.sourcePage}</td><td className="whitespace-nowrap px-3 py-2">{link.crawlStatus === "external" ? "External, not crawled" : link.httpStatus ? `HTTP ${link.httpStatus}` : link.crawlStatus === "failed" ? "Load failed" : "Not crawled"}</td></tr>)}</tbody></table> : <p className="p-4 text-sm text-[var(--foreground-muted)]">No links match this filter.</p>}
          </div>
          <div className="space-y-2">
            {result.pages.map((page) => <details key={page.url} className="border border-[var(--border)] px-3"><summary className="cursor-pointer py-3 text-xs font-medium text-[var(--foreground)]">{page.title || page.url}<span className="ml-2 font-normal text-[var(--foreground-muted)]">{page.url}</span></summary><div className="grid gap-4 border-t border-[var(--border)] py-3 sm:grid-cols-2"><div><h4 className="mb-2 text-xs font-semibold text-[var(--foreground-muted)]">Heading hierarchy</h4><p className="font-mono text-xs text-[var(--foreground)]">{page.structure.headingOrder.join(" → ") || "No headings detected"}</p><div className="mt-2 flex flex-wrap gap-2">{Object.entries(page.structure.headings).map(([heading, count]) => <span key={heading} className="text-xs text-[var(--foreground-muted)]">{heading.toUpperCase()}: {count}</span>)}</div><p className="mt-2 text-xs text-[var(--foreground-muted)]">Landmarks: {Object.entries(page.structure.landmarks).filter(([, count]) => count > 0).map(([name, count]) => `${name} ${count}`).join(" · ") || "None detected"}</p></div><div className="grid grid-cols-2 gap-2 text-xs text-[var(--foreground-muted)]">{Object.entries({ Images: page.structure.images, Links: page.structure.links, Buttons: page.structure.buttons, Forms: page.structure.forms, Tables: page.structure.tables, Iframes: page.structure.iframes, Inputs: page.structure.inputs, Dialogs: page.structure.dialogs }).map(([label, count]) => <span key={label}>{label}: <b className="text-[var(--foreground)]">{count}</b></span>)}</div></div></details>)}
          </div>
        </div>
      </details>

      <section className="space-y-4 border-b border-[var(--border)] pb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">Accessibility / WCAG audit</p><h3 className="mt-1 text-base font-semibold text-[var(--foreground)]">Automated Accessibility Score: {result.pages.length ? `${result.averageScore}/100` : "Unavailable"}</h3><p className="mt-1 text-xs text-[var(--foreground-muted)]">This product-defined score is not a measure of WCAG conformance.</p></div>
          <div className="flex flex-wrap gap-2 text-xs"><span className="text-[var(--success)]">{passedCount} passed</span><span className="text-[var(--danger)]">{failedCount} failed</span><span className="text-[var(--warning)]">{incompleteCount} manual review</span></div>
        </div>
        <p className="border border-[var(--warning)]/25 bg-[var(--warning-surface)] p-3 text-xs leading-relaxed text-[var(--foreground)]">Automated scans cover approximately 57% of WCAG criteria. Incomplete checks are not passes or violations; they need manual review.</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative sm:col-span-2"><Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-subtle)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search rule, WCAG, page, selector, or HTML" className="min-h-10 w-full border border-[var(--border)] bg-[var(--surface-inset)] pl-9 pr-3 text-xs text-[var(--foreground)]" /></label>
          <select aria-label="Filter by WCAG level" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className="min-h-10 border border-[var(--border)] bg-[var(--surface-inset)] px-3 text-xs text-[var(--foreground)]"><option value="all">All WCAG levels</option><option value="A">WCAG A</option><option value="AA">WCAG AA</option><option value="AAA">WCAG AAA</option></select>
          <select aria-label="Filter by impact" value={impactFilter} onChange={(event) => setImpactFilter(event.target.value as "all" | ImpactLevel)} className="min-h-10 border border-[var(--border)] bg-[var(--surface-inset)] px-3 text-xs text-[var(--foreground)]"><option value="all">All impact levels</option><option value="critical">Critical</option><option value="serious">Serious</option><option value="moderate">Moderate</option><option value="minor">Minor</option></select>
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Filter axe results">
          {(Object.keys(outcomeLabels) as OutcomeFilter[]).map((id) => <button key={id} type="button" aria-pressed={outcome === id} onClick={() => setOutcome(id)} className={`min-h-9 rounded-md border px-3 text-xs font-medium ${outcome === id ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--surface-raised)]"}`}>{outcomeLabels[id]} {id === "all" ? `(${allRules.length})` : `(${allRules.filter((rule) => rule.status === id).length})`}</button>)}
        </div>
        <p className="text-xs text-[var(--foreground-muted)]">Showing {rules.length} of {allRules.length} rule results. Every axe-reported node remains available in the expanded rule evidence.</p>
        <div className="space-y-2">{rules.length ? rules.map((rule, index) => <RuleCard key={`${rule.pageUrl}:${rule.id}:${rule.status}:${index}`} rule={rule} />) : <p className="border border-[var(--border)] p-4 text-sm text-[var(--foreground-muted)]">No axe rule results match these filters.</p>}</div>
      </section>

      {result.failedPages.length ? <details className="border border-[var(--danger)]/25 p-3"><summary className="cursor-pointer text-sm font-semibold text-[var(--danger)]">Pages that could not be loaded ({result.failedPages.length})</summary><ul className="mt-3 space-y-2">{result.failedPages.map((page) => <li key={page.url} className="break-all text-xs text-[var(--foreground-muted)]"><b className="text-[var(--foreground)]">{page.url}</b><br />{page.error}</li>)}</ul></details> : null}
    </div>
  );
}
