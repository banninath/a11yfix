"use client";

import { useRef, useState } from "react";
import { FileCode2, Loader2, Play, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { SAMPLE_HTML } from "@/lib/sampleHtml";

type InputTab = "paste" | "url" | "files";

interface UploadedHtmlFile {
  filename: string;
  html: string;
}

interface InputPanelProps {
  onSubmit: (payload: {
    mode?: "scan" | "files";
    html?: string;
    url?: string;
    files?: UploadedHtmlFile[];
    crawl?: boolean;
  }) => void;
  loading?: boolean;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error(`Could not read ${file.name} as text`));
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error(`Could not read ${file.name}`));
    };
    reader.readAsText(file);
  });
}

export default function InputPanel({
  onSubmit,
  loading = false,
}: InputPanelProps) {
  const [tab, setTab] = useState<InputTab>("paste");
  const [html, setHtml] = useState("");
  const [url, setUrl] = useState("");
  const [crawl, setCrawl] = useState(true);
  const [files, setFiles] = useState<UploadedHtmlFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmitDisabled =
    loading ||
    (tab === "paste"
      ? !html.trim()
      : tab === "files"
        ? files.length === 0
        : !url.trim());

  const tabButtonClass = (isActive: boolean) =>
    isActive
      ? "rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-muted)]"
      : "rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-[var(--foreground-muted)] transition-colors duration-150 ease-out hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-muted)]";

  async function addFiles(selectedFiles: FileList | File[]) {
    const candidates = Array.from(selectedFiles);
    if (candidates.length === 0) {
      return;
    }

    const accepted = candidates.filter((file) => {
      const extension = file.name.toLowerCase().split(".").pop();
      if (extension !== "html" && extension !== "htm") {
        toast.error(`${file.name} is not an HTML file`);
        return false;
      }
      if (file.size > 1024 * 1024) {
        toast.error(`${file.name} exceeds the 1 MB file limit`);
        return false;
      }
      return true;
    });

    if (accepted.length === 0) {
      return;
    }

    const availableCount = Math.max(0, 20 - files.length);
    const filesToRead = accepted.slice(0, availableCount);
    if (filesToRead.length < accepted.length) {
      toast.error("Only up to 20 files can be selected");
    }

    try {
      const readFiles = await Promise.all(
        filesToRead.map(async (file) => ({
          filename: file.name,
          html: await readFileAsText(file),
        }))
      );
      setFiles((current) => [...current, ...readFiles].slice(0, 20));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not read selected files"
      );
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void addFiles(event.dataTransfer.files);
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-[border-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-[var(--border-strong)] sm:p-6 md:p-8">
      <div className="mb-6 flex items-start gap-4">
        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-xs font-semibold text-[var(--accent)] tabular-nums">
          01
        </span>
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-1.5" aria-hidden="true">
            <span className="h-1 w-3 rounded-sm bg-[var(--accent)]" />
            <span className="h-1 w-3 rounded-sm bg-[var(--accent)]/60" />
            <span className="h-1 w-3 rounded-sm bg-[var(--accent)]/30" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
            Scan a website or provide source
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--foreground-muted)]">
            Audit a live website with a browser, inspect HTML, or scan uploaded files.
          </p>
        </div>
      </div>
      <div
        className="flex w-full flex-wrap gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] p-1 sm:w-fit"
        role="tablist"
        aria-label="Input type"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "paste"}
          className={tabButtonClass(tab === "paste")}
          onClick={() => setTab("paste")}
        >
          Paste Code
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "url"}
          className={tabButtonClass(tab === "url")}
          onClick={() => setTab("url")}
        >
          Load URL
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "files"}
          className={tabButtonClass(tab === "files")}
          onClick={() => setTab("files")}
        >
          Upload Files
        </button>
      </div>

      {tab === "paste" ? (
        <>
          <textarea
            value={html}
            onChange={(event) => setHtml(event.target.value)}
            placeholder="Paste your HTML or JSX here..."
            rows={10}
            className="mt-4 min-h-56 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] p-4 font-mono text-sm leading-relaxed text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] transition-[border-color,background-color] duration-150 ease-out focus:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          />
          <button
            type="button"
            onClick={() => setHtml(SAMPLE_HTML)}
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--accent)] transition-colors duration-150 ease-out hover:bg-[var(--accent)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            Load a broken HTML sample
          </button>
        </>
      ) : tab === "files" ? (
        <div className="mt-4 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".html,.htm"
            className="hidden"
            onChange={(event) => {
              void addFiles(event.currentTarget.files ?? []);
              event.currentTarget.value = "";
            }}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={openFilePicker}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openFilePicker();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setIsDragging(false);
              }
            }}
            onDrop={handleDrop}
            className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] ${
              isDragging
                ? "border-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--border-strong)] bg-[var(--surface-inset)] hover:border-[var(--accent)]/60 hover:bg-[var(--surface-raised)]"
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]">
              <Upload aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="mt-4 text-base font-semibold tracking-tight text-[var(--foreground)]">
              Drop HTML files here or click to browse
            </span>
            <span className="mt-1 text-sm text-[var(--foreground-muted)]">
              Up to 20 files · 1 MB each
            </span>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <ul className="space-y-2">
                {files.map((file, index) => (
                  <li
                    key={`${file.filename}-${index}`}
                    className="flex min-w-0 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] px-3 py-2.5"
                  >
                    <FileCode2
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-[var(--accent)]"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">
                      {file.filename}
                    </span>
                    <span className="shrink-0 text-xs text-[var(--foreground-muted)] tabular-nums">
                      {(new Blob([file.html]).size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.filename}`}
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((_, fileIndex) => fileIndex !== index)
                        )
                      }
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--foreground-muted)] transition-colors duration-150 ease-out hover:bg-[var(--danger-surface)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-inset)]"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              {files.length > 1 && (
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="min-h-9 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--foreground-muted)] transition-colors duration-150 ease-out hover:bg-[var(--surface-inset)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>
      ) : tab === "url" ? (
        <>
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            className="mt-4 min-h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] transition-[border-color,background-color] duration-150 ease-out focus:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          />
          <div className="mt-4 space-y-3">
            <label className="flex min-h-10 items-center gap-3 text-sm text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={crawl}
                onChange={(event) => setCrawl(event.target.checked)}
                className="h-4 w-4 accent-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
              />
              <span>Crawl internal pages and run accessibility checks</span>
            </label>
          </div>
        </>
      ) : (
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com"
          className="mt-4 min-h-12 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] transition-[border-color,background-color] duration-150 ease-out focus:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
        />
      )}

      <div className="mt-6 flex justify-end border-t border-[var(--border)] pt-5">
        <button
          type="button"
          onClick={() => {
            if (tab === "paste") {
              onSubmit({ html });
            } else if (tab === "files") {
              onSubmit({ mode: "files", files });
            } else if (tab === "url") {
              onSubmit({ url, crawl });
            } else {
              onSubmit({ url });
            }
          }}
          disabled={isSubmitDisabled}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-foreground)] transition-[background-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] sm:w-auto"
        >
          {loading ? (
            <Loader2
              aria-hidden="true"
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
            />
          ) : (
            <Play aria-hidden="true" className="h-4 w-4" />
          )}
          {loading
            ? "Running..."
            : tab === "files"
                ? "Scan Files"
                : tab === "url"
                  ? crawl ? "Scan Website" : "Scan Page"
                  : "Scan & Fix"}
        </button>
      </div>
    </section>
  );
}
