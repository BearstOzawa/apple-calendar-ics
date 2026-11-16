import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  foldContentLine,
  handleRequest,
  parseBundleOptions,
  resolveLegacyAssetPath,
} from "../worker/src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const siteDir = path.resolve(__dirname, "../site");

function mockEnv() {
  return {
    ASSETS: {
      async fetch(request) {
        const url = new URL(request.url);
        const rel = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
        const distCandidate = path.join(distDir, rel);
        const siteCandidate = path.join(siteDir, rel);
        const filePath = fs.existsSync(distCandidate)
          ? distCandidate
          : fs.existsSync(siteCandidate)
            ? siteCandidate
            : null;
        if (!filePath || !fs.statSync(filePath).isFile()) {
          return new Response("Not Found", { status: 404 });
        }
        return new Response(fs.readFileSync(filePath), { status: 200 });
      },
    },
  };
}

// 1. Legacy path resolution
assert.equal(
  resolveLegacyAssetPath("https://apple-calendar.lili.uno/apple-calendar-ics/essential.ics").pathname,
  "/essential.ics",
);
assert.equal(
  resolveLegacyAssetPath("https://apple-calendar.lili.uno/apple-calendar-ics/").pathname,
  "/",
);

// 2. Option parsing & validation
assert.ok(parseBundleOptions("https://apple-calendar.lili.uno/bundle.ics").error);
assert.ok(parseBundleOptions("https://apple-calendar.lili.uno/bundle.ics?feeds=unknown").error);
assert.ok(parseBundleOptions("https://apple-calendar.lili.uno/bundle.ics?feeds=essential&color=zzzzzz").error);

const parsed = parseBundleOptions(
  "https://apple-calendar.lili.uno/bundle.ics?feeds=work-rest.ics,festivals,solar-terms&name=我的日历&color=684b83&remind=09:00&download=1",
);
assert.deepEqual(parsed.slugs, ["work-rest", "festivals", "solar-terms"]);
assert.equal(parsed.name, "我的日历");
assert.equal(parsed.color, "#684B83");
assert.equal(parsed.remindTrigger, "PT9H");
assert.equal(parsed.download, true);

// 3. Dynamic /bundle.ics contextual deduplication & wire-format compliance
const env = mockEnv();
const t0 = performance.now();
const bundleRes = await handleRequest(
  new Request(
    "https://apple-calendar.lili.uno/bundle.ics?feeds=work-rest,festivals,solar-terms&name=我的中国日历&color=%23DE3D32&remind=09:00&download=1",
  ),
  env,
  { waitUntil() {} },
);
const elapsedMs = performance.now() - t0;

assert.equal(bundleRes.status, 200);
assert.equal(bundleRes.headers.get("Content-Type"), "text/calendar; charset=utf-8");
assert.equal(bundleRes.headers.get("Access-Control-Allow-Origin"), "*");
assert.match(bundleRes.headers.get("Content-Disposition") || "", /attachment/);
const etag = bundleRes.headers.get("ETag");
assert.ok(etag && etag.startsWith('"'));

const body = await bundleRes.text();
assert.ok(body.endsWith("\r\n"));
assert.ok(body.includes("X-APPLE-CALENDAR-COLOR:#DE3D32\r\n"));
assert.ok(body.includes("TRIGGER;VALUE=DURATION:PT9H\r\n"));

// Check 75-octet RFC 5545 line length limit on synthesized bundle
const encoder = new TextEncoder();
for (const line of body.split("\r\n").slice(0, -1)) {
  assert.ok(
    encoder.encode(line).byteLength <= 75,
    `Synthesized line exceeds 75 bytes: ${line}`,
  );
}

// Contextual deduplication: work-rest + festivals + solar-terms must match essential.ics event count (228)
const eventCount = body.split("BEGIN:VEVENT\r\n").length - 1;
assert.equal(eventCount, 228);

// Conditional If-None-Match -> 304
const notModified = await handleRequest(
  new Request(
    "https://apple-calendar.lili.uno/bundle.ics?feeds=work-rest,festivals,solar-terms&name=我的中国日历&color=%23DE3D32&remind=09:00&download=1",
    { headers: { "If-None-Match": etag } },
  ),
  env,
  { waitUntil() {} },
);
assert.equal(notModified.status, 304);

// Long folded UID preservation check (sky-events southern-delta-aquariids)
const skyBundle = await handleRequest(
  new Request("https://apple-calendar.lili.uno/bundle.ics?feeds=essential,sky-events"),
  env,
  { waitUntil() {} },
);
const skyText = await skyBundle.text();
assert.ok(skyText.includes("southern-delta-aquariids"));

// Legacy alias serves static ICS via env.ASSETS
const legacyRes = await handleRequest(
  new Request("https://apple-calendar.lili.uno/apple-calendar-ics/essential.ics"),
  env,
  {},
);
assert.equal(legacyRes.status, 200);
assert.equal(legacyRes.headers.get("Content-Type"), "text/calendar; charset=utf-8");

// OPTIONS & POST method handling
const optRes = await handleRequest(
  new Request("https://apple-calendar.lili.uno/bundle.ics", { method: "OPTIONS" }),
  env,
  {},
);
assert.equal(optRes.status, 204);

const postRes = await handleRequest(
  new Request("https://apple-calendar.lili.uno/bundle.ics", { method: "POST" }),
  env,
  {},
);
assert.equal(postRes.status, 405);

// Fold helper sanity check
const folded = foldContentLine("DESCRIPTION:" + "中国日历边缘合成测试内容，".repeat(8));
for (const l of folded.split("\r\n")) {
  assert.ok(encoder.encode(l).byteLength <= 75);
}

console.log(`worker: static assets, /bundle.ics synthesis (${elapsedMs.toFixed(2)}ms), 228-event dedup, VALARM, ETag & RFC 5545 folding valid`);
