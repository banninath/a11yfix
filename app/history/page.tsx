"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileClock, History, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import StatusBadge from "@/components/StatusBadge";
import { listCertificates } from "@/lib/supabase";
import type { Certificate } from "@/types";

export default function HistoryPage() {
  const router = useRouter();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    let mounted = true;

    async function loadCertificates() {
      try {
        const certificates = await listCertificates(50);
        if (mounted) {
          setCerts(certificates);
        }
      } catch (error) {
        if (mounted) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load certificate history"
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadCertificates();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredCertificates = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = certs.filter(
      (certificate) =>
        certificate.id.toLowerCase().includes(query) &&
        (statusFilter === "all" || certificate.status === statusFilter)
    );

    return filtered.sort((first, second) => {
      switch (sortOrder) {
        case "oldest":
          return (
            new Date(first.createdAt).getTime() -
            new Date(second.createdAt).getTime()
          );
        case "highest":
          return second.afterScore - first.afterScore;
        case "lowest":
          return first.afterScore - second.afterScore;
        default:
          return (
            new Date(second.createdAt).getTime() -
            new Date(first.createdAt).getTime()
          );
      }
    });
  }, [certs, search, sortOrder, statusFilter]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredCertificates.length / rowsPerPage)
  );
  const pageCertificates = filteredCertificates.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );
  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    sortOrder !== "newest";

  function openCertificate(id: string) {
    router.push(`/certificate/${encodeURIComponent(id)}`);
  }

  function handleRowKeyDown(
    event: React.KeyboardEvent<HTMLTableRowElement | HTMLLIElement>,
    id: string
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCertificate(id);
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setSortOrder("newest");
    setPage(1);
  }

  return (
    <div className="mx-auto w-full max-w-[1248px] space-y-8 px-4 py-8 sm:px-6 sm:py-10 md:px-8">
      <header className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-6 sm:px-6 sm:py-8">
        <div aria-hidden="true" className="mb-5 flex items-center gap-1.5">
          <span className="h-1 w-5 rounded-sm bg-[var(--accent)]" />
          <span className="h-1 w-5 rounded-sm bg-[var(--accent)]/60" />
          <span className="h-1 w-5 rounded-sm bg-[var(--accent)]/30" />
        </div>
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]">
            <History aria-hidden="true" className="h-5 w-5" />
          </span>
          History
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-muted)]">
          Past certificates saved to your Supabase project.
        </p>
      </header>

      {loading && (
        <div className="space-y-2" aria-label="Loading certificate history">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="h-3 w-1/3 animate-pulse rounded-sm bg-[var(--surface-raised)]" />
              <div className="h-5 w-2/3 animate-pulse rounded-sm bg-[var(--surface-inset)]" />
              <div className="flex gap-3">
                <div className="h-8 flex-1 animate-pulse rounded-sm bg-[var(--surface-inset)]" />
                <div className="h-8 flex-1 animate-pulse rounded-sm bg-[var(--surface-inset)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && certs.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-10 text-center sm:px-8">
          <div aria-hidden="true" className="mb-6 flex justify-center gap-1">
            <span className="h-1 w-5 rounded-sm bg-[var(--audit-trace-muted)]" />
            <span className="h-1 w-5 rounded-sm bg-[var(--accent)]" />
            <span className="h-1 w-5 rounded-sm bg-[var(--audit-trace-muted)]" />
          </div>
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]">
            <FileClock aria-hidden="true" className="h-5 w-5" />
          </span>
          <p className="text-base font-semibold tracking-tight text-[var(--foreground)]">
            No certificates yet
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--foreground-muted)]">
            Run a scan to generate one.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] transition-[background-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          >
            Go to scanner
          </Link>
        </div>
      )}

      {!loading && certs.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="min-w-48 flex-1">
              <span className="mb-1.5 block text-xs font-medium text-[var(--foreground-muted)]">
                Search by certificate ID
              </span>
              <span className="relative block">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-subtle)]"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by certificate ID…"
                  className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] py-2 pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                />
              </span>
            </label>

            <label className="min-w-36">
              <span className="mb-1.5 block text-xs font-medium text-[var(--foreground-muted)]">
                Status
              </span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] px-3 py-2 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                <option value="all">All</option>
                <option value="verified">Verified</option>
                <option value="partial">Partial</option>
                <option value="failed">Failed</option>
              </select>
            </label>

            <label className="min-w-40">
              <span className="mb-1.5 block text-xs font-medium text-[var(--foreground-muted)]">
                Sort
              </span>
              <select
                value={sortOrder}
                onChange={(event) => {
                  setSortOrder(event.target.value);
                  setPage(1);
                }}
                className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] px-3 py-2 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest score</option>
                <option value="lowest">Lowest score</option>
              </select>
            </label>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-10 px-2 text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="hidden w-full text-left text-sm sm:table">
            <thead className="bg-[var(--surface-raised)] text-xs uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
              <tr>
                <th scope="col" className="px-5 py-4 font-semibold">
                  ID
                </th>
                <th scope="col" className="px-5 py-4 font-semibold">
                  Date
                </th>
                <th scope="col" className="px-5 py-4 font-semibold">
                  Before
                </th>
                <th scope="col" className="px-5 py-4 font-semibold">
                  After
                </th>
                <th scope="col" className="px-5 py-4 font-semibold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {pageCertificates.map((certificate) => (
                <tr
                  key={certificate.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => openCertificate(certificate.id)}
                  onKeyDown={(event) =>
                    handleRowKeyDown(event, certificate.id)
                  }
                  className="cursor-pointer border-t border-[var(--border)] transition-colors duration-150 ease-out hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]"
                >
                  <td
                    className="px-5 py-4 font-mono text-xs text-[var(--foreground-muted)]"
                    title={certificate.id}
                  >
                    <Link
                      href={`/certificate/${encodeURIComponent(certificate.id)}`}
                      onClick={(event) => event.stopPropagation()}
                      className="hover:text-[var(--accent)]"
                    >
                      {certificate.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-[var(--foreground-muted)]">
                    {new Date(certificate.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-4 font-semibold tabular-nums text-[var(--danger)]">
                    {certificate.violationsBefore.length}
                  </td>
                  <td className="px-5 py-4 font-semibold tabular-nums text-[var(--foreground)]">
                    {certificate.violationsAfter.length}
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center justify-between gap-3">
                      <StatusBadge status={certificate.status} />
                      <ExternalLink
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-[var(--foreground-subtle)]"
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-[var(--border)] sm:hidden">
            {pageCertificates.map((certificate) => (
              <li
                key={certificate.id}
                role="link"
                tabIndex={0}
                onClick={() => openCertificate(certificate.id)}
                onKeyDown={(event) => handleRowKeyDown(event, certificate.id)}
                className="cursor-pointer space-y-4 p-4 transition-colors duration-150 ease-out hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--foreground-muted)]">
                      Certificate ID
                    </p>
                    <Link
                      href={`/certificate/${encodeURIComponent(certificate.id)}`}
                      onClick={(event) => event.stopPropagation()}
                      className="mt-1 inline-block break-all font-mono text-xs text-[var(--foreground)] hover:text-[var(--accent)]"
                      title={certificate.id}
                    >
                      {certificate.id.slice(0, 8)}…
                    </Link>
                  </div>
                  <span className="flex items-center gap-2">
                    <StatusBadge status={certificate.status} />
                    <ExternalLink
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-[var(--foreground-subtle)]"
                    />
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[var(--foreground-muted)]">
                  {new Date(certificate.createdAt).toLocaleString()}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] p-3">
                    <p className="text-xs text-[var(--foreground-muted)]">
                      Before
                    </p>
                    <p className="mt-1 font-semibold tabular-nums text-[var(--danger)]">
                      {certificate.violationsBefore.length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-inset)] p-3">
                    <p className="text-xs text-[var(--foreground-muted)]">
                      After
                    </p>
                    <p className="mt-1 font-semibold tabular-nums text-[var(--foreground)]">
                      {certificate.violationsAfter.length}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          </div>

          {filteredCertificates.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--foreground-muted)]">
              No certificates match these filters.
            </p>
          ) : (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <p className="text-sm text-[var(--foreground-muted)] tabular-nums">
                Page {page} of {pageCount}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="min-h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(pageCount, current + 1))
                  }
                  disabled={page === pageCount}
                  className="min-h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
