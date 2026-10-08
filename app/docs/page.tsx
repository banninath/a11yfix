import {
  AudioLines,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import DisclaimerBanner from "@/components/DisclaimerBanner";

const pipeline = [
  {
    label: "SCAN",
    description:
      "Render the submitted HTML or page and check it for accessibility violations.",
  },
  {
    label: "FIX",
    description:
      "Apply supported automatic fixes for missing image alt text, missing form labels, and unlabeled buttons.",
  },
  {
    label: "VERIFY",
    description:
      "Scan the result again to check which violations remain and identify regressions.",
  },
  {
    label: "CERTIFY",
    description:
      "Create an auditable certificate summarizing the scan, fixes, verification, and scores.",
  },
];

const supportedViolations = [
  {
    criteria: "WCAG 1.1.1",
    title: "Missing image alt text",
    description:
      "Images without an alt attribute receive generated descriptive text, or an empty alt value when appropriate.",
  },
  {
    criteria: "WCAG 1.3.1 / 3.3.2",
    title: "Missing form label",
    description:
      "Supported input, select, and textarea fields without a label receive an associated label.",
  },
  {
    criteria: "WCAG 4.1.2",
    title: "Unlabeled button",
    description:
      "Buttons without an accessible name receive a default aria-label.",
  },
];

const inputModes = [
  {
    title: "Paste Code",
    description: "Scan one HTML snippet pasted directly into the app.",
  },
  {
    title: "Load URL",
    description: "Scan a single page retrieved from the submitted URL.",
  },
  {
    title: "Load URL with crawl",
    description:
      "Optionally scan up to 10 pages on the same domain, starting from the submitted URL.",
  },
  {
    title: "Upload Files",
    description: "Scan up to 20 uploaded HTML files in one batch.",
  },
  {
    title: "Read Mode",
    description:
      "Hear an audio-first narration of a web page outline, including headings, links, forms, and useful image descriptions.",
  },
];

const certificateFields = [
  "ID",
  "Timestamp",
  "Input hash",
  "Before and after scores",
  "Violations",
  "Applied fixes",
  "Status",
];

function SectionHeading({
  icon: Icon,
  children,
}: {
  icon: typeof BookOpen;
  children: string;
}) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[var(--foreground)]">
      <Icon aria-hidden="true" className="h-5 w-5 text-[var(--accent)]" />
      {children}
    </h2>
  );
}

export default function DocsPage() {
  return (
    <div className="mx-auto w-full max-w-[1248px] space-y-8 px-4 py-8 sm:px-6 sm:py-10 md:px-8">
      <DisclaimerBanner />

      <header className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-6 sm:px-6 sm:py-8">
        <div aria-hidden="true" className="mb-5 flex items-center gap-1.5">
          <span className="h-1 w-5 rounded-sm bg-[var(--accent)]" />
          <span className="h-1 w-5 rounded-sm bg-[var(--accent)]/60" />
          <span className="h-1 w-5 rounded-sm bg-[var(--accent)]/30" />
        </div>
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]">
            <BookOpen aria-hidden="true" className="h-5 w-5" />
          </span>
          Documentation
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-muted)]">
          A guide to A11yFix features, the scan workflow, and its limitations.
        </p>
      </header>

      <section className="space-y-3">
        <SectionHeading icon={CheckCircle2}>What A11yFix does</SectionHeading>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--foreground)] sm:p-6">
          <p>
            A11yFix scans HTML and web pages for accessibility issues, and can
            automatically fix missing image descriptions, missing form labels,
            and unlabeled buttons. It verifies changes with another scan and
            creates an auditable certificate of the results.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading icon={Workflow}>The pipeline</SectionHeading>
        <ol className="grid gap-3 sm:grid-cols-2">
          {pipeline.map((stage, index) => (
            <li
              key={stage.label}
              className="flex min-w-0 gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--foreground)] transition-[border-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-[var(--border-strong)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-xs font-semibold text-[var(--accent)] tabular-nums">
                {index + 1}
              </span>
              <p className="min-w-0">
                <strong>{stage.label}</strong> — {stage.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <SectionHeading icon={ShieldCheck}>
          Supported violation types
        </SectionHeading>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {supportedViolations.map((violation) => (
            <article
              key={violation.title}
              className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-[border-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-[var(--border-strong)] sm:p-5"
            >
              <span className="inline-flex items-center rounded-md border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-2 py-1 text-xs font-semibold text-[var(--accent)]">
                {violation.criteria}
              </span>
              <h3 className="font-semibold leading-snug text-[var(--foreground)]">
                {violation.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--foreground-muted)]">
                {violation.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading icon={FileText}>Input modes</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          {inputModes.map((mode) => (
            <article
              key={mode.title}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <h3 className="font-semibold text-[var(--foreground)]">
                {mode.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--foreground-muted)]">
                {mode.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading icon={AudioLines}>Voice narration</SectionHeading>
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--foreground)] sm:p-6">
          <p>
            Voice narration is available for violation explanations on the main
            page and for the page outline in Read Mode.
          </p>
          <p className="text-[var(--foreground-muted)]">
            Chrome and Edge are recommended for the best browser speech
            experience. Press Space to pause or resume, Escape to stop, and R
            to repeat the current line.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading icon={ShieldCheck}>Site Health Audit</SectionHeading>
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--foreground)] sm:p-6">
          <p>
            A URL scan includes a read-only audit of the page. Enable the
            domain-wide option to check up to 10 same-domain pages; the report
            summarizes pass, warning, and failure counts across the pages and
            flags repeated titles and descriptions. Checks include explanations
            and suggested improvements. The audit never changes the scanned
            pages.
          </p>
          <ul className="grid gap-2 text-[var(--foreground-muted)] sm:grid-cols-2">
            <li>Metadata, including titles, descriptions, and canonical URLs.</li>
            <li>Language and locale declarations and text direction.</li>
            <li>Structured data and social sharing metadata.</li>
            <li>Document structure, headings, landmarks, and skip links.</li>
            <li>Link names, navigation, and internal link responses.</li>
            <li>Performance and security hints such as load time and HTTPS.</li>
          </ul>
          <p className="text-[var(--foreground-muted)]">
            The audit runs only for URL scans, not pasted HTML or uploaded
            files. Its score is a weighted summary of audit findings, not a
            WCAG score or a measure of WCAG conformance.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading icon={ClipboardList}>
          Certificates and History
        </SectionHeading>
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--foreground)] sm:p-6">
          <p>
            Certificates store an ID, timestamp, input hash, before and after
            scores, violations, applied fixes, and status.
          </p>
          <p>
            Each certificate has a public shareable URL in the form{" "}
            <code className="rounded bg-[var(--surface-inset)] px-1.5 py-0.5 font-mono text-xs">
              /certificate/&lt;id&gt;
            </code>
            . History supports search by certificate ID, status filtering,
            sorting, and pagination.
          </p>
          <ul className="flex flex-wrap gap-2">
            {certificateFields.map((field) => (
              <li
                key={field}
                className="rounded-md border border-[var(--border)] bg-[var(--surface-inset)] px-2.5 py-1 text-xs text-[var(--foreground-muted)]"
              >
                {field}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading icon={ShieldCheck}>Limitations</SectionHeading>
        <div className="rounded-xl border border-[var(--warning)]/25 bg-[var(--warning-surface)] p-4 sm:p-6">
          <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-[var(--foreground)]">
            <li>Only three violation types are automatically fixed.</li>
            <li>
              Automated scans cover approximately 57% of WCAG criteria; manual
              review is still needed.
            </li>
            <li>
              Certificates are auditable records, not legal guarantees of
              accessibility or compliance.
            </li>
            <li>Read Mode does not fill in or submit forms.</li>
            <li>
              Submitted input is not stored separately; the input snippet
              included in a saved certificate is retained as certificate data.
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading icon={ShieldCheck}>Privacy</SectionHeading>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--foreground)] sm:p-6">
          <ul className="list-inside list-disc space-y-2">
            <li>No audio recordings are stored.</li>
            <li>No user form data is stored.</li>
            <li>Certificate data is stored in Supabase.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
