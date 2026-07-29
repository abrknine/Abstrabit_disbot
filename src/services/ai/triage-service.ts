import { env } from "../../config/env";
import { logger } from "../../utils/logger";

const aiLogger = logger.child({ context: "ai" });

export interface TriageResult {
  summary: string;
  category: "bug" | "question" | "feature-request" | "abuse" | "other";
  priority: "low" | "medium" | "high";
}

const CATEGORIES = new Set(["bug", "question", "feature-request", "abuse", "other"]);
const PRIORITIES = new Set(["low", "medium", "high"]);

const SYSTEM_PROMPT = `You are a support ticket triage assistant for a product's Discord community.
Given a user report, respond with ONLY a JSON object:
{"summary": "<one line, max 15 words>", "category": "bug|question|feature-request|abuse|other", "priority": "low|medium|high"}
Judge priority by real impact (data loss, payments, blocked usage = high), not by how loudly the user asks.`;

/** Returns null on any failure — callers must treat AI as best-effort. */
export const triageReport = async (report: {
  title: string;
  description: string;
  urgency?: string;
}): Promise<TriageResult | null> => {
  if (!env.AI_API_KEY) return null;

  try {
    const res = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Title: ${report.title}\nDescription: ${report.description}\nUser-claimed urgency: ${report.urgency ?? "not given"}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      aiLogger.warn({ status: res.status }, "triage request rejected");
      return null;
    }

    const body = await res.json();
    const parsed = JSON.parse(body.choices?.[0]?.message?.content ?? "{}");
    const category = String(parsed.category ?? "").toLowerCase();
    const priority = String(parsed.priority ?? "").toLowerCase();

    if (!parsed.summary || !CATEGORIES.has(category) || !PRIORITIES.has(priority)) {
      aiLogger.warn({ parsed }, "triage response failed validation");
      return null;
    }

    return {
      summary: String(parsed.summary).slice(0, 200),
      category: category as TriageResult["category"],
      priority: priority as TriageResult["priority"],
    };
  } catch (err) {
    aiLogger.warn({ err }, "triage failed");
    return null;
  }
};
