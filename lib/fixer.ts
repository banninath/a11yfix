import type { Fix, FixResponse, Violation } from "@/types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, token: string) => {
    const normalized = token.toLowerCase();
    if (normalized === "amp") return "&";
    if (normalized === "lt") return "<";
    if (normalized === "gt") return ">";
    if (normalized === "quot") return '"';
    if (normalized === "apos") return "'";
    if (normalized === "nbsp") return "\u00a0";
    const codePoint = normalized.startsWith("#x")
      ? Number.parseInt(normalized.slice(2), 16)
      : Number.parseInt(normalized.slice(1), 10);
    try {
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    } catch {
      return "\uFFFD";
    }
  });
}

function attributeValue(tag: string, name: string): string | null {
  const match = tag.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")
  );
  return match ? (match[1] ?? match[2] ?? match[3] ?? "") : null;
}

function attributeMarkup(tag: string, name: string): string | null {
  return tag.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+)`, "i")
  )?.[0] ?? null;
}

function replaceViolationElement(
  html: string,
  violation: Violation,
  replacement: string
): string | null {
  const index = html.indexOf(violation.elementHtml);
  if (index < 0) {
    return null;
  }
  return (
    html.slice(0, index) +
    replacement +
    html.slice(index + violation.elementHtml.length)
  );
}

function fixMissingAlt(
  html: string,
  violation: Violation
): { html: string; fix: Fix } | null {
  const before = violation.elementHtml;
  const alt = attributeValue(before, "aria-label");
  const ariaLabelMarkup = attributeMarkup(before, "aria-label");
  if (
    !/^<img\b/i.test(before) ||
    /\balt\s*=/i.test(before) ||
    !alt?.trim() ||
    !ariaLabelMarkup
  ) {
    return null;
  }

  const altMarkup = ariaLabelMarkup.replace(/^[^=]+/, "alt");
  const after = before.replace(/^<img\b/i, `<img ${altMarkup}`);
  const fixedHtml = replaceViolationElement(html, violation, after);
  if (fixedHtml === null) {
    return null;
  }

  return {
    html: fixedHtml,
    fix: {
      violationId: violation.id,
      fixableType: "missing-alt",
      selector: violation.selector,
      before,
      after,
      note: "Copied the existing aria-label to the missing alt attribute",
    },
  };
}

function fixMissingTitleFromOgTitle(
  html: string,
  violation: Violation,
): { html: string; fix: Fix } | null {
  const head = /<head\b[^>]*>[\s\S]*?<\/head\s*>/i.exec(html)?.[0];
  if (!head) return null;

  const ogTitleTag = html.match(/<meta\b[^>]*>/gi)?.find(
    (tag) => attributeValue(tag, "property")?.trim().toLowerCase() === "og:title",
  );
  const rawTitle = ogTitleTag ? attributeValue(ogTitleTag, "content")?.trim() : "";
  if (!rawTitle) return null;

  const existingTitle = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(head);
  if (existingTitle?.[1].trim()) return null;

  const titleText = escapeHtml(decodeHtmlEntities(rawTitle));
  const titleMarkup = `<title>${titleText}</title>`;
  const fixedHead = existingTitle
    ? head.replace(existingTitle[0], titleMarkup)
    : head.replace(/(<head\b[^>]*>)/i, `$1${titleMarkup}`);
  const fixedHtml = html.replace(head, fixedHead);
  if (fixedHtml === html) return null;

  return {
    html: fixedHtml,
    fix: {
      violationId: violation.id,
      fixableType: "missing-title",
      selector: violation.selector,
      before: existingTitle?.[0] ?? "No title element",
      after: titleMarkup,
      note: "Used the page's existing Open Graph title",
    },
  };
}

export async function applyFixes(
  html: string,
  violations: Violation[]
): Promise<FixResponse> {
  let fixedHtml = html;
  const fixes: Fix[] = [];

  for (const violation of violations) {
    const result = violation.fixableType === "missing-alt"
      ? fixMissingAlt(fixedHtml, violation)
      : violation.fixableType === "missing-title"
        ? fixMissingTitleFromOgTitle(fixedHtml, violation)
        : null;
    if (!result) continue;
    fixedHtml = result.html;
    fixes.push(result.fix);
  }

  return { fixedHtml, fixes };
}
