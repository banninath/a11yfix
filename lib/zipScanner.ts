import "server-only";

import { scanHtml } from "@/lib/scanner";
import type { Violation } from "@/types";

export interface UploadedFile {
  filename: string;
  html: string;
}

export interface FileScanResult {
  filename: string;
  violations: Violation[];
  score: number;
}

export interface MultiFileScanResult {
  files: FileScanResult[];
  totalViolations: number;
  averageScore: number;
  worstFile: string;
}

const DEFAULT_MAX_FILES = 20;
const MAX_FILE_BYTES = 1024 * 1024;
const encoder = new TextEncoder();

function emptyResult(): MultiFileScanResult {
  return {
    files: [],
    totalViolations: 0,
    averageScore: 0,
    worstFile: "",
  };
}

function isSupportedFile(file: UploadedFile): boolean {
  const extension = file.filename.toLowerCase().split(".").pop();
  return (
    (extension === "html" || extension === "htm") &&
    file.html.trim().length > 0 &&
    encoder.encode(file.html).byteLength <= MAX_FILE_BYTES
  );
}

export async function scanFiles(
  files: UploadedFile[],
  maxFiles = DEFAULT_MAX_FILES
): Promise<MultiFileScanResult> {
  try {
    if (!Array.isArray(files)) {
      return emptyResult();
    }

    const fileLimit =
      Number.isFinite(maxFiles) && maxFiles >= 0
        ? Math.floor(maxFiles)
        : DEFAULT_MAX_FILES;
    const results: FileScanResult[] = [];

    for (const file of files.slice(0, fileLimit)) {
      if (
        typeof file?.filename !== "string" ||
        typeof file.html !== "string" ||
        !isSupportedFile(file)
      ) {
        continue;
      }

      try {
        const scan = await scanHtml(file.html);
        results.push({
          filename: file.filename,
          violations: scan.violations,
          score: scan.score,
        });
      } catch {
        results.push({
          filename: file.filename,
          violations: [],
          score: 0,
        });
      }
    }

    if (results.length === 0) {
      return emptyResult();
    }

    const totalViolations = results.reduce(
      (total, result) => total + result.violations.length,
      0
    );
    const averageScore = Math.round(
      results.reduce((total, result) => total + result.score, 0) /
        results.length
    );
    const worstFile = [...results].sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      if (a.filename < b.filename) {
        return -1;
      }
      if (a.filename > b.filename) {
        return 1;
      }
      return 0;
    })[0]?.filename ?? "";

    return { files: results, totalViolations, averageScore, worstFile };
  } catch {
    return emptyResult();
  }
}
