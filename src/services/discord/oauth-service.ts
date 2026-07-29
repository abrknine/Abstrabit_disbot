import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { ApiError } from "../../utils/api-error";

// Send Messages (2048) + Manage Webhooks (536870912) — webhooks are needed so
// the app can provision the mirror webhook in the channel the admin picks.
const BOT_PERMISSIONS = "536872960";

const redirectUri = () => `${env.BACKEND_PUBLIC_URL}/api/discord/callback`;

export const isOAuthConfigured = (): boolean => !!env.DISCORD_CLIENT_SECRET;

/** Signed short-lived state token — proves the callback originated from our dashboard (CSRF guard). */
export const buildInstallUrl = (adminEmail: string): string => {
  if (!isOAuthConfigured()) {
    throw ApiError.badRequest("DISCORD_CLIENT_SECRET is not configured");
  }
  const state = jwt.sign({ purpose: "discord-install", sub: adminEmail }, env.JWT_SECRET, {
    expiresIn: "10m",
  });
  const params = new URLSearchParams({
    client_id: env.DISCORD_APP_ID,
    scope: "bot applications.commands",
    permissions: BOT_PERMISSIONS,
    response_type: "code",
    redirect_uri: redirectUri(),
    state,
  });
  return `https://discord.com/oauth2/authorize?${params}`;
};

export const verifyState = (state: string): void => {
  try {
    const payload = jwt.verify(state, env.JWT_SECRET) as { purpose?: string };
    if (payload.purpose !== "discord-install") throw new Error("wrong purpose");
  } catch {
    throw ApiError.badRequest("Invalid or expired OAuth state");
  }
};

export interface InstalledGuild {
  guildId: string;
  name: string;
  icon: string | null;
}

/** Exchanges the OAuth code; the token response includes the guild the admin installed into. */
export const exchangeCode = async (code: string): Promise<InstalledGuild> => {
  const res = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.DISCORD_APP_ID,
      client_secret: env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw ApiError.badRequest(`Discord code exchange failed (HTTP ${res.status})`);
  }

  const body = await res.json();
  const guild = body.guild;
  if (!guild?.id) {
    throw ApiError.badRequest("Discord response did not include an installed guild");
  }
  return { guildId: guild.id, name: guild.name ?? "Unknown server", icon: guild.icon ?? null };
};
