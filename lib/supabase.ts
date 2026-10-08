import { createClient } from "@supabase/supabase-js";
import type {
  Certificate,
  CertificateStatus,
  Fix,
  Violation,
} from "@/types";
import { isFix, isViolation } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

function recordOf(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Supabase returned an invalid certificate record");
  }
  return value as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new Error(`Supabase certificate field "${key}" is invalid`);
  }
  return value;
}

function requiredNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Supabase certificate field "${key}" is invalid`);
  }
  return value;
}

function requiredArray<T>(
  value: unknown,
  guard: (entry: unknown) => entry is T,
  field: string
): T[] {
  if (!Array.isArray(value) || !value.every(guard)) {
    throw new Error(`Supabase certificate field "${field}" is invalid`);
  }
  return value.filter(guard);
}

function statusOf(value: unknown): CertificateStatus {
  if (value === "verified" || value === "partial" || value === "failed") {
    return value;
  }
  throw new Error('Supabase certificate field "status" is invalid');
}

function mapCertificate(value: unknown): Certificate {
  const record = recordOf(value);
  return {
    id: requiredString(record, "id"),
    createdAt: requiredString(record, "created_at"),
    inputHash: requiredString(record, "input_hash"),
    inputSnippet: requiredString(record, "input_snippet"),
    violationsBefore: requiredArray<Violation>(
      record.violations_before,
      isViolation,
      "violations_before"
    ),
    violationsAfter: requiredArray<Violation>(
      record.violations_after,
      isViolation,
      "violations_after"
    ),
    fixesApplied: requiredArray<Fix>(record.fixes_applied, isFix, "fixes_applied"),
    regressions: requiredArray<Violation>(
      record.regressions,
      isViolation,
      "regressions"
    ),
    status: statusOf(record.status),
    summary: requiredString(record, "summary"),
    beforeScore: requiredNumber(record, "before_score"),
    afterScore: requiredNumber(record, "after_score"),
  };
}

export async function saveCertificate(cert: Certificate): Promise<boolean> {
  const client = supabase;
  if (!client) {
    console.warn("[A11yFix] Certificate not saved: Supabase is not configured");
    return false;
  }

  const { error } = await client.from("certificates").insert({
    id: cert.id,
    created_at: cert.createdAt,
    input_hash: cert.inputHash,
    input_snippet: cert.inputSnippet,
    violations_before: cert.violationsBefore,
    violations_after: cert.violationsAfter,
    fixes_applied: cert.fixesApplied,
    regressions: cert.regressions,
    status: cert.status,
    summary: cert.summary,
    before_score: cert.beforeScore,
    after_score: cert.afterScore,
  });

  if (error) {
    throw new Error(`Failed to save certificate: ${error.message}`);
  }
  return true;
}

export async function listCertificates(limit = 50): Promise<Certificate[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new RangeError("Certificate limit must be an integer from 1 to 500");
  }

  const client = supabase;
  if (!client) {
    console.warn("[A11yFix] Certificate history unavailable: Supabase is not configured");
    return [];
  }

  const { data, error } = await client
    .from("certificates")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to list certificates: ${error.message}`);
  }
  return data.map(mapCertificate);
}

export async function getCertificate(id: string): Promise<Certificate | null> {
  const client = supabase;
  if (!client) {
    console.warn("[A11yFix] Certificate lookup unavailable: Supabase is not configured");
    return null;
  }

  const { data, error } = await client
    .from("certificates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get certificate: ${error.message}`);
  }
  return data ? mapCertificate(data) : null;
}
