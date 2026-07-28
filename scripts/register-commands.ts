import "dotenv/config";

const APP_ID = process.env.DISCORD_APP_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!APP_ID || !GUILD_ID || !BOT_TOKEN) {
  console.error("Missing env vars. Fill in .env (copy from .env.example) first.");
  process.exit(1);
}

const commands = [
  {
    name: "report",
    description: "Report an issue",
    type: 1, // CHAT_INPUT (slash command)
    options: [
      {
        name: "text",
        description: "Describe the issue",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "status",
    description: "Show current status and report count",
    type: 1,
  },
];

async function main() {
  const url = `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`;

  const res = await fetch(url, {
    method: "PUT", // bulk overwrite — idempotent, safe to re-run anytime
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });

  const body = await res.json();

  if (!res.ok) {
    console.error(`Failed (HTTP ${res.status}):`, JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log(`Registered ${body.length} commands in guild ${GUILD_ID}:`);
  for (const cmd of body) {
    console.log(`  /${cmd.name} — ${cmd.description}`);
  }
}

main();
