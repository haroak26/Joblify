import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const SECURITY_FILE = new URL("./security.ts", import.meta.url);

async function getSource() {
  return readFile(SECURITY_FILE, "utf8");
}

test("tiered rate limiter resolves limits from req.userPlan and supports free/student/plus/ultra/lifetime ceilings", async () => {
  const source = await getSource();

  assert.match(
    source,
    /const plan = normalizePlan\(req\.userPlan\);/,
    "createTieredRateLimit should derive plan from req.userPlan",
  );

  assert.match(source, /case "student":\s*case "plus":\s*return plusLimit;/, "student and plus plans should use plusLimit ceiling");
  assert.match(source, /case "ultra":\s*case "lifetime":\s*return ultraLimit;/, "ultra/lifetime should share ultraLimit ceiling");
  assert.match(source, /default:\s*return freeLimit;/, "free/default users should use freeLimit ceiling");
});

test("resolveUserPlan middleware populates req.userPlan from session user id with free fallback", async () => {
  const source = await getSource();

  assert.match(source, /const userId = req\.session\?\.userId;/, "middleware should read session user id");
  assert.match(source, /if \(!userId\) \{\s*req\.userPlan = "free";/, "anonymous users should default to free");
  assert.match(source, /storage\.getSubscription\(userId\)/, "middleware should resolve subscriptions from storage");
  assert.match(source, /req\.userPlan = normalizePlan\(subscription\?\.plan\);/, "resolved plans should be normalized");
  assert.match(source, /catch \(error\) \{\s*[\s\S]*req\.userPlan = "free";/, "errors should fail open to free plan");
});
