import assert from "node:assert/strict";

import { proxyRequest, upstreamUrlFor } from "../worker/src/index.mjs";

assert.equal(
  upstreamUrlFor("https://apple-calendar.lili.uno/").href,
  "https://bearstozawa.github.io/apple-calendar-ics/",
);
assert.equal(
  upstreamUrlFor(
    "https://apple-calendar.lili.uno/apple-calendar-ics/essential.ics?source=test",
  ).href,
  "https://bearstozawa.github.io/apple-calendar-ics/essential.ics?source=test",
);
assert.equal(
  upstreamUrlFor("https://apple-calendar.lili.uno//example.com/escape").origin,
  "https://bearstozawa.github.io",
);

let observedUrl;
let observedOptions;
const response = await proxyRequest(
  new Request("https://apple-calendar.lili.uno/essential.ics", {
    headers: {
      Authorization: "must-not-be-forwarded",
      "If-None-Match": '"calendar-etag"',
    },
  }),
  async (url, options) => {
    observedUrl = url;
    observedOptions = options;
    return new Response("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n", {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        ETag: '"calendar-etag"',
      },
    });
  },
);

assert.equal(
  observedUrl.href,
  "https://bearstozawa.github.io/apple-calendar-ics/essential.ics",
);
assert.equal(observedOptions.headers.get("If-None-Match"), '"calendar-etag"');
assert.equal(observedOptions.headers.has("Authorization"), false);
assert.equal(response.status, 200);
assert.equal(response.headers.get("Content-Type"), "text/calendar; charset=utf-8");
assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
assert.equal(response.headers.get("X-Calendar-Proxy"), "cloudflare");
assert.match(response.headers.get("Cache-Control"), /max-age=300/);

const optionsResponse = await proxyRequest(
  new Request("https://apple-calendar.lili.uno/manifest.json", {
    method: "OPTIONS",
  }),
);
assert.equal(optionsResponse.status, 204);

const methodResponse = await proxyRequest(
  new Request("https://apple-calendar.lili.uno/manifest.json", {
    method: "POST",
  }),
);
assert.equal(methodResponse.status, 405);
assert.equal(methodResponse.headers.get("Allow"), "GET, HEAD, OPTIONS");

const failureResponse = await proxyRequest(
  new Request("https://apple-calendar.lili.uno/manifest.json"),
  async () => {
    throw new Error("upstream unavailable");
  },
);
assert.equal(failureResponse.status, 502);
assert.equal(failureResponse.headers.get("Cache-Control"), "no-store");

console.log("worker: fixed upstream, headers, methods, caching and failure handling valid");
