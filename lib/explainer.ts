import { GoogleGenAI } from "@google/genai";
import type { Violation } from "@/types";

const MODEL_NAME = "gemini-3.8-flash";
const MAX_CACHE_ENTRIES = 500;
const explanationCache = new Map<string, string>();
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

function cacheKey(violation: Violation): string {
  return `${violation.ruleId}\u0000${violation.selector}`;
}

function readCache(key: string): string | undefined {
  const cached = explanationCache.get(key);
  if (cached === undefined) {
    return undefined;
  }

  explanationCache.delete(key);
  explanationCache.set(key, cached);
  return cached;
}

function writeCache(key: string, explanation: string): void {
  explanationCache.delete(key);
  explanationCache.set(key, explanation);

  if (explanationCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = explanationCache.keys().next().value;
    if (oldestKey !== undefined) {
      explanationCache.delete(oldestKey);
    }
  }
}

export async function explainViolation(
  violation: Violation
): Promise<string> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  try {
    if (violation.fixableType === "not-fixable" || !genAI) {
      return "";
    }

    const key = cacheKey(violation);
    const cached = readCache(key);
    if (cached !== undefined) {
      return cached;
    }

    const interaction = await Promise.race([
      genAI.interactions.create({
        model: MODEL_NAME,
        input: `Explain this fixable accessibility violation in plain English for a web developer. Include exactly these three labeled parts: What's wrong, Why it matters, and How the fix works. Keep each part to one concise sentence. Do not claim the page is fully accessible.
Rule: ${violation.ruleId}
WCAG criterion: ${violation.wcagCriterion}
Impact: ${violation.impact}
Issue: ${violation.help}
Details: ${violation.description}
Fix type: ${violation.fixableType}
Affected element: ${violation.elementHtml}`,
        store: false,
      }, {
        fetchOptions: { signal: controller.signal },
        maxRetries: 0,
      }),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(new Error("AI explanation timed out"));
        }, 4000);
      }),
    ]);

    const explanation = (interaction.output_text ?? "").trim();
    if (!explanation) {
      return "";
    }

    writeCache(key, explanation);
    return explanation;
  } catch (error) {
    console.error(
      "[A11yFix] explainViolation error:",
      error instanceof Error ? error.message : String(error)
    );
    return "";
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
