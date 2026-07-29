ABSTRABIT TRIAGE DESK

A support ticket desk that lives inside Discord. Users file reports with a slash command,
an AI triages them (summary, category, priority), moderators claim/resolve them with buttons,
every ticket mirrors to a second channel via webhook, and admins watch and configure
everything from a web dashboard.

Live URLs
- Dashboard (frontend): https://abstrabit-disbot.vercel.app
- Backend / interactions endpoint: https://abstrabit-disbot.onrender.com

Admin login (throwaway account for reviewers)
- email: reviewer@abstrabit.test
- password: reviewpass123

Test discord servers
- server 1 (bot lives here, run /report and /status):
 https://discord.gg/Wat3teUGTY
- server 2 (mirrored channel, watch ticket alerts arrive): https://discord.gg/2yn8yM3nGr


WHAT IT DOES

- /report in discord opens a modal form. on submit the ticket is recorded in postgres,
  triaged by ai (groq), and the reply becomes a ticket card with claim / resolve buttons
- /status replies with the live queue for that server (open, in progress, resolved counts)
- every ticket is mirrored to a second channel webhook - the server's own configured
  channel, or a global fallback webhook
- the dashboard (behind login) shows the command log with ai triage and mirror status,
  queue stats, per command config (enable/disable, mirror on/off, ai on/off, reply template),
  and a servers tab to connect new discord servers via oauth2 and pick their mirror channel

Reliability and security
- every request from discord is verified with its ed25519 signature (forged/unsigned -> 401)
- duplicate deliveries are deduped on the interaction id at the db level
- slow work (ai) runs after a deferred acknowledgment, so the 3 second window is never missed
- ticket is saved to db before any slow work. ai failure -> ticket saved as unclassified.
  mirror failure -> retried 3 times, outcome recorded and visible in dashboard
- secrets live only in backend env vars, validated at boot. frontend holds no secrets


RUN LOCALLY

prereqs: node 20+, a discord application (app id, public key, bot token, client secret),
optionally a postgres url (neon) and a groq api key.

backend (port 3000):
  cp .env.example .env          (fill in your values)
  npm install
  npm run migrate               (creates tables + seeds first admin from ADMIN_EMAIL/ADMIN_PASSWORD)
  npm run register              (registers slash commands in DISCORD_GUILD_ID, one time)
  npm run dev

frontend (port 5173), second terminal:
  cd frontend
  npm install
  npm run dev

to receive real discord traffic locally, expose port 3000 with a tunnel
(cloudflared tunnel --url http://localhost:3000 or ngrok) and set
https://your-tunnel/interactions as the interactions endpoint url in the developer portal.

tests:
  npm run smoke-test
runs 20 checks (signature rejection, ping/pong, modal, dedup, buttons, auth, config gating)
against the real app booted in-process with a generated keypair. no db or network needed.


ENVIRONMENT VARIABLES

see .env.example for the full list with comments. summary:

  DISCORD_APP_ID          app identity (install url, command registration, reply edits)
  DISCORD_PUBLIC_KEY      verifying discord request signatures
  DISCORD_BOT_TOKEN       outbound bot calls (register commands, list channels, create webhooks)
  DISCORD_CLIENT_SECRET   oauth2 code exchange for the add-to-discord flow
  DISCORD_GUILD_ID        only used by the manual npm run register script
  MIRROR_WEBHOOK_URL      fallback mirror channel webhook
  DATABASE_URL            neon postgres (optional locally, falls back to in-memory)
  ADMIN_EMAIL/PASSWORD    first boot seed for the initial admin user only
  JWT_SECRET              signs dashboard jwts and oauth state tokens
  CORS_ORIGIN             allowed dashboard origins, comma separated
  AI_API_KEY              groq key (optional - without it tickets file as unclassified)
  BACKEND_PUBLIC_URL      oauth redirect uri base (production)
  FRONTEND_URL            where oauth returns the browser after connect (production)

frontend build time: VITE_API_URL - the backend base url.


DEPLOYMENT

- backend on render (free tier): build npm install, start npm start, env vars set in
  render dashboard. migrations run automatically on boot.
- frontend on vercel (free tier): root directory frontend/, VITE_API_URL set to render url
- database on neon (free tier)
- developer portal: interactions endpoint url -> https://<render>/interactions,
  oauth2 redirect -> https://<render>/api/discord/callback
- render free tier sleeps after 15 min idle; a free cron pinger hits /healthz every
  10 minutes to keep the first command from timing out


TESTING IT (FOR REVIEWERS)

1. open the dashboard and log in: reviewer@abstrabit.test / reviewpass123
2. servers tab -> add to discord -> pick any server you manage -> authorize.
   slash commands are registered automatically
3. optionally pick a mirror channel for that server (creates a webhook in it).
   without it, mirrors go to the fallback channel
4. in your server: /report -> fill the form -> the thinking message becomes a
   triaged ticket card with buttons. click claim, then resolve
5. /status -> live queue counts
6. back on the dashboard: command log with ai triage, stats, config toggles.
   flip /report off and run it in discord to see the disabled reply

