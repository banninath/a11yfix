import type { Metadata } from "next";
import Link from "next/link";
import CertificateCard from "@/components/CertificateCard";
import { getCertificate } from "@/lib/supabase";

interface CertificatePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: CertificatePageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Certificate ${id.slice(0, 8)} · A11yFix`,
  };
}

export default async function CertificatePage({
  params,
}: CertificatePageProps) {
  const { id } = await params;
  const certificate = await getCertificate(id);

  return (
    <main className="mx-auto w-full max-w-[1248px] space-y-6 px-4 py-8 sm:px-6 sm:py-10 md:px-8">
      <Link
        href="/history"
        className="inline-flex min-h-10 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors duration-150 ease-out hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
      >
        Back to History
      </Link>

      {certificate ? (
        <CertificateCard certificate={certificate} saved />
      ) : (
        <section className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-4 py-10 text-center sm:px-8">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Certificate not found
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-muted)]">
            This certificate may have been removed or the link may be
            incorrect.
          </p>
        </section>
      )}
    </main>
  );
}
