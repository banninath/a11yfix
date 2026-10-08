"use client";

interface HtmlPreviewProps {
  originalHtml: string;
  fixedHtml: string;
}

function PreviewFrame({ title, html }: { title: string; html: string }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] transition-[border-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-[var(--border-strong)]">
      <h4 className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 text-sm font-semibold text-[var(--foreground)]">
        <span aria-hidden="true" className="flex items-center gap-1.5">
          <span className="h-1.5 w-3 rounded-sm bg-[var(--accent)]" />
          <span className="h-1.5 w-2 rounded-sm bg-[var(--accent)]/60" />
          <span className="h-1.5 w-2 rounded-sm bg-[var(--accent)]/30" />
        </span>
        {title}
      </h4>
      <div className="bg-[var(--surface-inset)] p-2 sm:p-3">
        <iframe
          title={title}
          srcDoc={html}
          sandbox=""
          referrerPolicy="no-referrer"
          loading="lazy"
          className="h-96 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)]"
        />
      </div>
    </section>
  );
}

export default function HtmlPreview({
  originalHtml,
  fixedHtml,
}: HtmlPreviewProps) {
  return (
    <section
      aria-label="Before and after HTML preview"
      className="mt-6 space-y-4 border-t border-[var(--border)] pt-6"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <PreviewFrame title="Before fixes" html={originalHtml} />
        <PreviewFrame title="After fixes" html={fixedHtml} />
      </div>
      <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] px-4 py-3 text-xs leading-relaxed text-[var(--foreground-muted)]">
        Previews are sandboxed. Scripts, form submissions, popups, and access
        to the parent page are disabled.
      </p>
    </section>
  );
}
