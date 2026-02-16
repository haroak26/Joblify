import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const SECURITY_FILE = new URL("./security.ts", import.meta.url);
const DB_FILE = new URL("../db.ts", import.meta.url);
const AUTH_FILE = new URL("../auth.ts", import.meta.url);

async function source(fileUrl) {
  return readFile(fileUrl, "utf8");
}

test("security middleware uses database-backed shared rate limiter storage", async () => {
  const src = await source(SECURITY_FILE);

  assert.match(src, /CREATE TABLE IF NOT EXISTS \$\{RATE_LIMIT_TABLE_NAME\}/, "should create shared postgres counter table");
  assert.match(src, /INSERT INTO \$\{RATE_LIMIT_TABLE_NAME\}/, "should upsert counters in postgres");
  assert.match(src, /ON CONFLICT \(key\) DO UPDATE/, "should atomically update shared counters");
  assert.match(src, /export const authRateLimit = createDistributedRateLimit\(/, "auth limiter should use distributed limiter");
  assert.match(src, /export const registrationRateLimit = createDistributedRateLimit\(/, "registration limiter should use distributed limiter");
});

test("login lockout helpers use shared persistent counters instead of in-memory map", async () => {
  const src = await source(SECURITY_FILE);

  assert.match(src, /export async function trackLoginAttempt\(/, "trackLoginAttempt should be async and shared-state backed");
  assert.match(src, /export async function isAccountLocked\(/, "isAccountLocked should be async and shared-state backed");
  assert.doesNotMatch(src, /new Map<\s*string,\s*\{\s*count:/, "in-memory login attempt map should be removed");
});

test("sanitizeInput avoids mutating string content while dropping prototype pollution keys", async () => {
  const src = await source(SECURITY_FILE);

  assert.match(src, /const blockedKeys = new Set\(\["__proto__", "prototype", "constructor"\]\);/, "should remove prototype pollution keys");
  assert.doesNotMatch(src, /replace\(\/&\/g, "&amp;"\)/, "should not globally HTML-escape every string");
});

test("database config enforces ssl in production", async () => {
  const src = await source(DB_FILE);
  assert.match(src, /ssl:\s*\n\s*process\.env\.NODE_ENV === "production"/, "db pool should set explicit ssl policy in production");
});

test("auth login route awaits async lockout helpers", async () => {
  const src = await source(AUTH_FILE);
  assert.match(src, /if \(await isAccountLocked\(username\)\)/, "login must await async lockout reads");
  assert.match(src, /await trackLoginAttempt\(username\);/, "login must await lockout counter writes");
  assert.match(src, /await resetLoginAttempts\(username\);/, "login must await lockout reset");
});
