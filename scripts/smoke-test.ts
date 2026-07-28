/**
 * Self-contained smoke test: boots the app in-process with a generated
 * Ed25519 keypair, then replays the exact scenarios Discord (and the
 * reviewers) will throw at the endpoint:
 *   1. PING with a valid signature       -> 200 PONG
 *   2. PING with a forged signature      -> 401
 *   3. Request with no signature headers -> 401
 *   4. /status command (signed)          -> 200 reply
 *   5. /report command (signed)          -> 200 reply
 *   6. Same /report delivered again      -> duplicate ack, no double record
 */
import nacl from "tweetnacl";

const keypair = nacl.sign.keyPair();
const toHex = (b: Uint8Array) => Buffer.from(b).toString("hex");

// Configure env BEFORE importing app (dotenv does not override preset vars).
process.env.NODE_ENV = "test";
process.env.DISCORD_PUBLIC_KEY = toHex(keypair.publicKey);
process.env.DISCORD_APP_ID = process.env.DISCORD_APP_ID || "123456789012345678";
process.env.DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || "123456789012345678";
process.env.DISCORD_BOT_TOKEN = "test-token";
process.env.MIRROR_WEBHOOK_URL = "https://mirror.invalid/webhook";
process.env.ADMIN_EMAIL = "admin@test.local";
process.env.ADMIN_PASSWORD = "test-password";
process.env.JWT_SECRET = "0".repeat(64);
process.env.DATABASE_URL = ""; // force in-memory store (delete would let dotenv re-load it from .env)

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

const ping = { id: "ping-1", type: 1, token: "t" };
const statusCmd = {
  id: "int-status-1", type: 2, token: "t", guild_id: "guild-1", channel_id: "chan-1",
  member: { user: { id: "u1", username: "alice" } },
  data: { name: "status" },
};
const reportCmd = {
  id: "int-report-1", type: 2, token: "t", guild_id: "guild-1", channel_id: "chan-1",
  member: { user: { id: "u1", username: "alice" } },
  data: { name: "report", options: [{ name: "text", type: 3, value: "login is broken" }] },
};

const r1 = await post(ping);
check("valid PING answered with PONG", r1.status === 200 && r1.body?.type === 1, r1);

const r2 = await post(ping, { forge: true });
check("forged signature rejected with 401", r2.status === 401, r2);

const r3 = await post(ping, { unsigned: true });
check("missing signature headers rejected with 401", r3.status === 401, r3);

const r4 = await post(statusCmd);
check(
  "/status returns a reply",
  r4.status === 200 && r4.body?.type === 4 && /Reports logged/.test(r4.body?.data?.content ?? ""),
  r4
);

const r5 = await post(reportCmd);
check(
  "/report returns confirmation",
  r5.status === 200 && r5.body?.type === 4 && /logged/.test(r5.body?.data?.content ?? ""),
  r5
);

const r6 = await post(reportCmd);
check(
  "duplicate delivery acknowledged without reprocessing",
  r6.status === 200 && /already processed/.test(r6.body?.data?.content ?? ""),
  r6
);

const r7 = await post(statusCmd === reportCmd ? statusCmd : { ...statusCmd, id: "int-status-2" });
check(
  "report count is 1 after duplicate delivery (dedup worked)",
  r7.status === 200 && /\*\*1\*\*/.test(r7.body?.data?.content ?? ""),
  r7
);

const login = async (email: string, password: string) => {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return { status: res.status, body: await res.json() };
};

const r8 = await login("admin@test.local", "wrong-password");
check("login rejects wrong password", r8.status === 401, r8);

const r9 = await login("admin@test.local", "test-password");
const token = r9.body?.data?.token;
check("login returns a token", r9.status === 200 && !!token, r9);

const authed = (path: string, init: RequestInit = {}) =>
  fetch(`${base}/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
  });

const r10 = await fetch(`${base}/api/interactions`);
check("dashboard API rejects missing token", r10.status === 401, await r10.json());

const r11 = await authed("/interactions");
const rows = (await r11.json())?.data;
check("dashboard lists recorded interactions", r11.status === 200 && rows?.length === 3, rows?.length);

const r12 = await authed("/config/report", {
  method: "PUT",
  body: JSON.stringify({ enabled: false, mirrorEnabled: true, replyTemplate: null }),
});
check("admin can update command config", r12.status === 200, await r12.json());

const r13 = await post({ ...reportCmd, id: "int-report-disabled" });
check(
  "disabled command replies with disabled notice",
  r13.status === 200 && /disabled/.test(r13.body?.data?.content ?? ""),
  r13
);

server.close();
console.log(failures === 0 ? "\nAll smoke tests passed." : `\n${failures} test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
