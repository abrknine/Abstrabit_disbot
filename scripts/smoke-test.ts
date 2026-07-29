/**
 * Self-contained smoke test: boots the app in-process with a generated
 * Ed25519 keypair and replays what Discord (and reviewers) will throw at it:
 * signature checks, PING, modal open/submit, deferred ack, dedup, buttons,
 * AI-off fallback, auth, and config gating.
 */
import nacl from "tweetnacl";

const keypair = nacl.sign.keyPair();
const toHex = (b: Uint8Array) => Buffer.from(b).toString("hex");

// Configure env BEFORE importing app (dotenv does not override preset vars).
process.env.NODE_ENV = "test";
process.env.DISCORD_PUBLIC_KEY = toHex(keypair.publicKey);
process.env.DISCORD_APP_ID = "123456789012345678";
process.env.DISCORD_GUILD_ID = "123456789012345678";
process.env.DISCORD_BOT_TOKEN = "test-token";
process.env.MIRROR_WEBHOOK_URL = "https://mirror.invalid/webhook";
process.env.ADMIN_EMAIL = "admin@test.local";
process.env.ADMIN_PASSWORD = "test-password";
process.env.JWT_SECRET = "0".repeat(64);
process.env.DATABASE_URL = ""; // force in-memory store (delete would let dotenv re-load it from .env)
process.env.AI_API_KEY = ""; // AI off — tickets must fall back to "unclassified"
process.env.DISCORD_CLIENT_SECRET = "test-client-secret";

const { app } = await import("../src/app");
const { getRepository } = await import("../src/services/storage/interaction-repository");
const { seedAdminUser } = await import("../src/services/storage/user-repository");
await getRepository().init();
await seedAdminUser();

const server = app.listen(0);
const port = (server.address() as { port: number }).port;
const base = `http://127.0.0.1:${port}`;

const sign = (body: string, timestamp: string) =>
  toHex(nacl.sign.detached(Buffer.from(timestamp + body), keypair.secretKey));

const post = async (body: object, opts: { forge?: boolean; unsigned?: boolean } = {}) => {
  const raw = JSON.stringify(body);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!opts.unsigned) {
    headers["X-Signature-Timestamp"] = timestamp;
    headers["X-Signature-Ed25519"] = opts.forge ? "ab".repeat(64) : sign(raw, timestamp);
  }
  const res = await fetch(`${base}/interactions`, { method: "POST", headers, body: raw });
  return { status: res.status, body: await res.json().catch(() => null) };
};

let failures = 0;
const check = (name: string, ok: boolean, detail: unknown) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${JSON.stringify(detail)}`}`);
  if (!ok) failures++;
};

const user = { member: { user: { id: "u1", username: "alice" } }, guild_id: "guild-1", channel_id: "chan-1" };
const ping = { id: "ping-1", type: 1, token: "t" };
const reportCmd = { id: "int-report-1", type: 2, token: "t", ...user, data: { name: "report" } };
const statusCmd = { id: "int-status-1", type: 2, token: "t", ...user, data: { name: "status" } };
const modalSubmit = {
  id: "int-modal-1", type: 5, token: "t", ...user,
  data: {
    custom_id: "report_modal",
    components: [
      { type: 1, components: [{ type: 4, custom_id: "title", value: "Login broken" }] },
      { type: 1, components: [{ type: 4, custom_id: "description", value: "Cannot log in after reset" }] },
      { type: 1, components: [{ type: 4, custom_id: "urgency", value: "high" }] },
    ],
  },
};

// Signature & PING
const r1 = await post(ping);
check("valid PING answered with PONG", r1.status === 200 && r1.body?.type === 1, r1);
const r2 = await post(ping, { forge: true });
check("forged signature rejected with 401", r2.status === 401, r2);
const r3 = await post(ping, { unsigned: true });
check("missing signature headers rejected with 401", r3.status === 401, r3);

// /report opens the modal
const r4 = await post(reportCmd);
check(
  "/report opens a modal (type 9)",
  r4.status === 200 && r4.body?.type === 9 && r4.body?.data?.custom_id === "report_modal",
  r4
);

// Modal submit defers, records the ticket
const r5 = await post(modalSubmit);
check("modal submit acknowledged with deferred response (type 5)", r5.status === 200 && r5.body?.type === 5, r5);

const r6 = await post(modalSubmit);
check(
  "duplicate modal submit acknowledged without reprocessing",
  r6.status === 200 && /already processed/.test(r6.body?.data?.content ?? ""),
  r6
);

// Give the async finalize (AI fallback + mirror to invalid host) a moment.
await new Promise((r) => setTimeout(r, 300));

// /status reflects the queue
const r7 = await post(statusCmd);
check(
  "/status reports the ticket queue",
  r7.status === 200 && /1 open/.test(r7.body?.data?.content ?? ""),
  r7
);

// Button click: claim the ticket (interaction type 3)
const claimClick = {
  id: "int-click-1", type: 3, token: "t", ...user,
  member: { user: { id: "u2", username: "mod-bob" } },
  data: { custom_id: "claim:int-modal-1", component_type: 2 },
};
const r8 = await post(claimClick);
check(
  "claim button updates the ticket message (type 7)",
  r8.status === 200 && r8.body?.type === 7 && /In progress/.test(r8.body?.data?.content ?? "") &&
    /mod-bob/.test(r8.body?.data?.content ?? ""),
  r8
);

const resolveClick = { ...claimClick, id: "int-click-2", data: { custom_id: "resolve:int-modal-1", component_type: 2 } };
const r9 = await post(resolveClick);
check(
  "resolve button closes the ticket and removes buttons",
  r9.status === 200 && /Resolved/.test(r9.body?.data?.content ?? "") &&
    (r9.body?.data?.components ?? []).length === 0,
  r9
);

// Admin auth + dashboard
const login = async (email: string, password: string) => {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return { status: res.status, body: await res.json() };
};

const r10 = await login("admin@test.local", "wrong-password");
check("login rejects wrong password", r10.status === 401, r10);

const r11 = await login("admin@test.local", "test-password");
const token = r11.body?.data?.token;
check("login returns a token", r11.status === 200 && !!token, r11);

const r12 = await fetch(`${base}/api/interactions`);
check("dashboard API rejects missing token", r12.status === 401, await r12.json());

const authed = (path: string, init: RequestInit = {}) =>
  fetch(`${base}/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
  });

const rows = (await (await authed("/interactions")).json())?.data;
const ticket = rows?.find((r: { command: string }) => r.command === "report");
check("dashboard lists the ticket and the status command", rows?.length === 2, rows?.length);
check(
  "AI-off fallback stored ticket as unclassified",
  ticket?.aiCategory === "unclassified" && ticket?.status === "resolved" && ticket?.claimedBy === "mod-bob",
  ticket
);

const stats = (await (await authed("/stats")).json())?.data;
check("stats include ticket queue numbers", stats?.total === 2 && stats?.openTickets === 0, stats);

// OAuth connect flow
const installRes = await authed("/discord/install-url");
const installUrl = (await installRes.json())?.data?.url ?? "";
check(
  "install URL is a Discord authorize link with signed state",
  installRes.status === 200 &&
    installUrl.startsWith("https://discord.com/oauth2/authorize") &&
    installUrl.includes("state="),
  installUrl.slice(0, 80)
);

const cbUnauth = await fetch(`${base}/api/discord/install-url`);
check("install URL requires admin auth", cbUnauth.status === 401, cbUnauth.status);

const badState = await fetch(`${base}/api/discord/callback?code=x&state=tampered`);
check("oauth callback rejects tampered state", badState.status === 400, badState.status);

const r13 = await authed("/config/report", {
  method: "PUT",
  body: JSON.stringify({ enabled: false, mirrorEnabled: true, aiEnabled: true, replyTemplate: null }),
});
check("admin can update command config", r13.status === 200, await r13.json());

const r14 = await post({ ...reportCmd, id: "int-report-disabled" });
check(
  "disabled command replies with disabled notice",
  r14.status === 200 && /disabled/.test(r14.body?.data?.content ?? ""),
  r14
);

server.close();
console.log(failures === 0 ? "\nAll smoke tests passed." : `\n${failures} test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
