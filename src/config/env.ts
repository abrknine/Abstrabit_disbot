import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DISCORD_APP_ID: z.string().regex(/^\d+$/, "must be a numeric snowflake"),
  DISCORD_PUBLIC_KEY: z.string().regex(/^[0-9a-f]{64}$/i, "must be a 64-char hex string"),
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_GUILD_ID: z.string().regex(/^\d+$/, "must be a numeric snowflake"),
  // Fallback mirror target; per-guild webhooks (created via the dashboard
  // connect flow) take precedence.
  MIRROR_WEBHOOK_URL: z.string().url(),
  // OAuth2 app credentials — enables the dashboard "Add to Discord" flow.
  DISCORD_CLIENT_SECRET: z.string().optional(),
  // Public URLs used to build the OAuth redirect and to return to the UI.
  BACKEND_PUBLIC_URL: z.string().url().default("http://localhost:3000"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  // Optional: without it the app runs on an in-memory store (development only).
  // Empty string counts as unset so tests can force the memory store.
  DATABASE_URL: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().url().optional()
  ),
  // Frontend origin(s) allowed to call the API, comma-separated.
  // Use the deployed frontend URL in production, e.g. "https://myapp.vercel.app".
  CORS_ORIGIN: z.string().default("*"),
  // OpenAI-compatible LLM for ticket triage. Optional: without a key, tickets
  // are filed as "unclassified" instead of being AI-triaged.
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().url().default("https://api.groq.com/openai/v1"),
  AI_MODEL: z.string().default("llama-3.1-8b-instant"),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  JWT_SECRET: z.string().min(32),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const [key, errors] of Object.entries(parsed.error.flatten().fieldErrors)) {
    console.error(`  ${key}: ${errors?.join(", ")}`);
  }
  process.exit(1);
}

export const env = parsed.data;
