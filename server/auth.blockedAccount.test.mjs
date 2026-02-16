import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const AUTH_FILE = new URL("./auth.ts", import.meta.url);

async function getSource() {
  return readFile(AUTH_FILE, "utf8");
}

test("blocked user login attempts return 403 before password verification", async () => {
  const source = await getSource();

  assert.match(source, /app\.post\("\/api\/auth\/login"[\s\S]*if \(user\.accountBlocked\) \{[\s\S]*return res\.status\(403\)/);

  const blockedCheckIndex = source.indexOf("if (user.accountBlocked)");
  const verifyPasswordIndex = source.indexOf("const isValid = await verifyPassword");
  assert.ok(blockedCheckIndex !== -1, "login route should check user.accountBlocked");
  assert.ok(verifyPasswordIndex !== -1, "login route should verify password");
  assert.ok(blockedCheckIndex < verifyPasswordIndex, "blocked check should happen before password verification");
});

test("requireAuth performs defense-in-depth blocked-account checks for active sessions", async () => {
  const source = await getSource();

  assert.match(source, /export async function requireAuth\(/, "requireAuth should be async to allow storage lookup");
  assert.match(source, /const user = await storage\.getUser\(req\.session\.userId\);/, "requireAuth should fetch the user from the session id");
  assert.match(source, /if \(user\.accountBlocked\) \{[\s\S]*return res\.status\(403\)/, "requireAuth should deny blocked users with 403");
});

test("blocked/unblocked behavior remains explicit and applies to admins too", async () => {
  const source = await getSource();

  assert.match(source, /const ACCOUNT_BLOCKED_MESSAGE = "This account has been blocked\. Please contact support for assistance\.";/);
  assert.match(source, /if \(user\.accountBlocked\) \{[\s\S]*error: "Account access blocked",[\s\S]*message: ACCOUNT_BLOCKED_MESSAGE,/);
  assert.ok(!source.includes("user.isAdmin && user.accountBlocked"), "blocked check should not special-case admin users");
});

