// One-time (and on menu changes): npm run register
import "dotenv/config";
import { commandDefinitions } from "../src/services/discord/command-definitions";

const APP_ID = process.env.DISCORD_APP_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!APP_ID || !GUILD_ID || !BOT_TOKEN) {
  console.error("Missing env vars. Fill in .env (copy from .env.example) first.");
  process.exit(1);
}

const res = await fetch(
  `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`,
  {
    method: "PUT", // bulk overwrite — idempotent, safe to re-run anytime
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commandDefinitions),
  }
);

const body = await res.json();

if (!res.ok) {
  console.error(`Failed (HTTP ${res.status}):`, JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log(`Registered ${body.length} commands in guild ${GUILD_ID}:`);
for (const cmd of body) {
  console.log(`  /${cmd.name} — ${cmd.description}`);
}
