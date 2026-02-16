import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROUTES_FILE = new URL("./routes.ts", import.meta.url);

test("cover-letter generate route is declared once with required middleware", async () => {
  const source = await readFile(ROUTES_FILE, "utf8");

  const routeMatches = source.match(/app\.post\("\/api\/cover-letter\/generate"/g) ?? [];
  assert.equal(routeMatches.length, 1, "expected exactly one /api/cover-letter/generate route declaration");

  assert.match(
    source,
    /app\.post\("\/api\/cover-letter\/generate",\s*aiRateLimit,\s*requireAuth,\s*requireAIAccess,\s*async/,
    "cover-letter generate route should enforce aiRateLimit, requireAuth, and requireAIAccess middleware"
  );
});
