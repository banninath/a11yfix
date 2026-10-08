import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;
const MODEL_NAME = "gemini-3.8-flash";

export async function generateAltText(src: string): Promise<string> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();

  try {
    const source = src.trim();
    if (!genAI || !source) {
      return "";
    }

    const interaction = await Promise.race([
      genAI.interactions.create(
        {
          model: MODEL_NAME,
          input: `Generate short descriptive alt text (maximum 12 words) for an image with this source: ${source}
If the image is clearly decorative (spacers, backgrounds, dividers), respond with exactly: DECORATIVE
Otherwise, respond with only the alt text, without quotes or prefixes.`,
          store: false,
        },
        {
          fetchOptions: { signal: controller.signal },
          maxRetries: 0,
        }
      ),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(new Error("Alt-text generation timed out after 4 seconds"));
        }, 4000);
      }),
    ]);

    const text = (interaction.output_text ?? "")
      .trim()
      .replace(/^["'`]|["'`]$/g, "")
      .trim();

    if (!text || text.toUpperCase() === "DECORATIVE") {
      return "";
    }

    return text.split(/\s+/).slice(0, 12).join(" ");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[A11yFix] generateAltText error:", message);
    return "";
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}
