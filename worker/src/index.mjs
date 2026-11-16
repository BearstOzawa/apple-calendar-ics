const PRODID = "-//BearstOzawa//Apple Calendar ICS//ZH-CN";
const TIMEZONE = "Asia/Shanghai";
const DEFAULT_LANGUAGE = "zh-CN";
const LEGACY_PREFIX = "/apple-calendar-ics/";
const ALLOWED_METHODS = new Set(["GET", "HEAD"]);

export const KNOWN_FEEDS = {
  essential: { name: "中国日历", color: "#DE3D32", cssColor: "crimson" },
  "work-rest": { name: "中国班休", color: "#684B83", cssColor: "rebeccapurple" },
  festivals: { name: "传统节日", color: "#D66B2C", cssColor: "chocolate" },
  "solar-terms": { name: "二十四节气", color: "#BF8626", cssColor: "goldenrod" },
  observances: { name: "公众节日与纪念日", color: "#5B708F", cssColor: "slategray" },
  "holiday-reminders": { name: "假期提醒", color: "#CC5F3B", cssColor: "coral" },
  "life-festivals": { name: "生活节日", color: "#BA506D", cssColor: "mediumvioletred" },
  "lunar-days": { name: "农历初一十五", color: "#52705E", cssColor: "seagreen" },
  seasonal: { name: "中国时令", color: "#8A6235", cssColor: "peru" },
  "moon-phases": { name: "月相", color: "#47749F", cssColor: "steelblue" },
  "sky-events": { name: "重要天象", color: "#B72F59", cssColor: "firebrick" },
  almanac: { name: "黄历宜忌", color: "#9A4FA5", cssColor: "darkorchid" },
  "lunar-mansions": { name: "二十八星宿", color: "#765D45", cssColor: "sienna" },
};

const COLOR_SWATCH_CSS = {
  "#DE3D32": "crimson",
  "#D66B2C": "chocolate",
  "#BF8626": "goldenrod",
  "#2F7D57": "seagreen",
  "#52705E": "seagreen",
  "#47749F": "steelblue",
  "#5B708F": "slategray",
  "#684B83": "rebeccapurple",
  "#9A4FA5": "darkorchid",
  "#BA506D": "mediumvioletred",
  "#B72F59": "firebrick",
  "#CC5F3B": "coral",
  "#8A6235": "peru",
  "#765D45": "sienna",
};

const REMINDER_TRIGGERS = {
  "08:00": "PT8H",
  "09:00": "PT9H",
  "12:00": "PT12H",
  "20:00": "PT20H",
  "prev-20:00": "-PT4H",
};

const encoder = new TextEncoder();

function corsHeaders(headers = new Headers()) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "If-Modified-Since, If-None-Match, Range",
  );
  headers.set(
    "Access-Control-Expose-Headers",
    "ETag, Last-Modified, Content-Length",
  );
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
}

export function escapeIcsText(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}

export function foldContentLine(line, limit = 75) {
  if (line.includes("\r") || line.includes("\n")) {
    throw new Error("content line must not contain raw newlines");
  }
  const parts = [];
  let current = "";
  let currentBytes = 0;
  let payloadLimit = limit;
  for (const char of line) {
    const charBytes = encoder.encode(char).byteLength;
    if (current && currentBytes + charBytes > payloadLimit) {
      parts.push(current);
      current = char;
      currentBytes = charBytes;
      payloadLimit = limit - 1;
    } else {
      current += char;
      currentBytes += charBytes;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function parseBundleOptions(requestUrl) {
  const url = new URL(requestUrl);
  const rawFeeds = (url.searchParams.get("feeds") || url.searchParams.get("ch") || "")
    .split(",")
    .map((item) => item.trim().replace(/\.ics$/i, "").toLowerCase())
    .filter(Boolean);

  if (!rawFeeds.length) {
    return { error: "请通过 feeds 参数指定至少一个日历频道。" };
  }

  const slugs = [];
  for (const slug of rawFeeds) {
    if (!KNOWN_FEEDS[slug]) {
      return { error: `未知的日历频道：${slug}` };
    }
    if (!slugs.includes(slug)) {
      slugs.push(slug);
    }
  }
  if (slugs.length > 8) {
    return { error: "单次合订最多支持 8 个频道。" };
  }

  const primary = KNOWN_FEEDS[slugs[0]];
  const rawName = (url.searchParams.get("name") || "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  const name = rawName
    ? rawName.slice(0, 32)
    : slugs.length === 1
      ? primary.name
      : "中国日历";

  const rawColor = (url.searchParams.get("color") || "").trim();
  let color = primary.color;
  if (rawColor) {
    const normalized = rawColor.startsWith("#") ? rawColor.toUpperCase() : `#${rawColor.toUpperCase()}`;
    if (!/^#[0-9A-F]{6}$/.test(normalized)) {
      return { error: "color 参数需为 6 位十六进制颜色值（如 #DE3D32）。" };
    }
    color = normalized;
  }
  const cssColor = COLOR_SWATCH_CSS[color] || primary.cssColor || "crimson";

  const rawRemind = (url.searchParams.get("remind") || "").trim();
  let remindTrigger = null;
  if (rawRemind && rawRemind !== "none" && rawRemind !== "0") {
    remindTrigger = REMINDER_TRIGGERS[rawRemind];
    if (!remindTrigger) {
      return { error: "remind 参数仅支持 08:00、09:00、12:00、20:00 或 prev-20:00。" };
    }
  }

  const download = url.searchParams.get("download") === "1";
  return { slugs, name, color, cssColor, remind: rawRemind || "", remindTrigger, download };
}

function readHeaderField(veventBlock, prefix) {
  const startIndex = veventBlock.indexOf(prefix);
  if (startIndex === -1) return "";
  let cursor = startIndex + prefix.length;
  let result = "";
  while (cursor < veventBlock.length) {
    const lineEnd = veventBlock.indexOf("\r\n", cursor);
    if (lineEnd === -1) {
      result += veventBlock.slice(cursor);
      break;
    }
    result += veventBlock.slice(cursor, lineEnd);
    const nextChar = veventBlock[lineEnd + 2];
    if (nextChar === " " || nextChar === "\t") {
      cursor = lineEnd + 3;
    } else {
      break;
    }
  }
  return result;
}

function parseEventsFromIcs(icsText) {
  const marker = "BEGIN:VEVENT\r\n";
  const endMarker = "\r\nEND:VEVENT";
  const firstIndex = icsText.indexOf(marker);
  if (firstIndex === -1) return [];

  const body = icsText.slice(firstIndex);
  const rawParts = body.split(marker);
  const parsed = [];

  for (let i = 1; i < rawParts.length; i += 1) {
    const chunk = rawParts[i];
    const endIdx = chunk.lastIndexOf(endMarker);
    if (endIdx === -1) continue;
    const inner = chunk.slice(0, endIdx);
    const head = inner.length > 360 ? inner.slice(0, 360) : inner;
    const uid = readHeaderField(head, "UID:");
    const start = readHeaderField(head, "DTSTART;VALUE=DATE:");
    const end = readHeaderField(head, "DTEND;VALUE=DATE:");

    const xIdx = inner.indexOf("\r\nX-CN-CALENDAR-");
    const metaSlice = xIdx !== -1 ? inner.slice(xIdx + 2) : inner;
    const kind = readHeaderField(metaSlice, "X-CN-CALENDAR-KIND:").toLowerCase();
    const conceptsRaw = readHeaderField(metaSlice, "X-CN-CALENDAR-CONCEPTS:");
    const concepts = conceptsRaw ? conceptsRaw.split(",").filter(Boolean).sort() : [];

    let cleanInner = inner;
    if (xIdx !== -1) {
      const specialIdx = inner.indexOf("\r\nX-APPLE-SPECIAL-DAY:", xIdx);
      cleanInner =
        specialIdx !== -1
          ? inner.slice(0, xIdx) + inner.slice(specialIdx)
          : inner.slice(0, xIdx);
    }

    parsed.push({
      uid,
      start,
      end,
      kind,
      concepts,
      semanticKey: `${start}|${end}|${kind}|${concepts.join(",")}`,
      vevent: `BEGIN:VEVENT\r\n${cleanInner}\r\nEND:VEVENT`,
    });
  }
  return parsed;
}

function injectAlarm(vevent, trigger) {
  const alarm = [
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:日程提醒",
    `TRIGGER;VALUE=DURATION:${trigger}`,
    "END:VALARM",
  ].join("\r\n");
  return `${vevent.slice(0, -10)}${alarm}\r\nEND:VEVENT`;
}

export function synthesizeBundleIcs(feedPayloads, options) {
  const allCandidates = [];
  const holidayByConcept = new Map();

  for (const text of feedPayloads) {
    const events = parseEventsFromIcs(text);
    for (const item of events) {
      allCandidates.push(item);
      if (item.kind === "holiday-period") {
        for (const concept of item.concepts) {
          let ranges = holidayByConcept.get(concept);
          if (!ranges) {
            ranges = [];
            holidayByConcept.set(concept, ranges);
          }
          ranges.push(item);
        }
      }
    }
  }

  const seenUids = new Set();
  const seenSemantics = new Set();
  const merged = [];

  allCandidates.sort((a, b) => (
    a.start.localeCompare(b.start) ||
    a.end.localeCompare(b.end) ||
    a.kind.localeCompare(b.kind) ||
    a.uid.localeCompare(b.uid)
  ));

  for (const event of allCandidates) {
    if (seenUids.has(event.uid) || seenSemantics.has(event.semanticKey)) {
      continue;
    }
    if (event.kind === "festival" || event.kind === "solar-term") {
      let coveredByHoliday = false;
      for (const concept of event.concepts) {
        const periods = holidayByConcept.get(concept);
        if (
          periods &&
          periods.some((period) => period.start <= event.start && event.start < period.end)
        ) {
          coveredByHoliday = true;
          break;
        }
      }
      if (coveredByHoliday) continue;
    }
    seenUids.add(event.uid);
    seenSemantics.add(event.semanticKey);
    merged.push(
      options.remindTrigger ? injectAlarm(event.vevent, options.remindTrigger) : event.vevent,
    );
  }

  const feedNames = options.slugs.map((slug) => KNOWN_FEEDS[slug].name).join("、");
  const description = `包含频道：${feedNames}`;
  const headerLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `NAME;LANGUAGE=${DEFAULT_LANGUAGE}:${escapeIcsText(options.name)}`,
    `DESCRIPTION;LANGUAGE=${DEFAULT_LANGUAGE}:${escapeIcsText(description)}`,
    `COLOR:${options.cssColor}`,
    `X-APPLE-CALENDAR-COLOR:${options.color}`,
    `X-WR-CALNAME;LANGUAGE=${DEFAULT_LANGUAGE}:${escapeIcsText(options.name)}`,
    `X-WR-CALDESC;LANGUAGE=${DEFAULT_LANGUAGE}:${escapeIcsText(description)}`,
    `X-WR-TIMEZONE:${TIMEZONE}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H",
  ].map((line) => foldContentLine(line));

  return `${headerLines.join("\r\n")}\r\n${merged.join("\r\n")}\r\nEND:VCALENDAR\r\n`;
}

async function computeEtag(payloadBytes) {
  const digest = await crypto.subtle.digest("SHA-256", payloadBytes);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
  return `"${hex}"`;
}

export function resolveLegacyAssetPath(requestUrl) {
  const incoming = new URL(requestUrl);
  if (incoming.pathname === "/apple-calendar-ics" || incoming.pathname === LEGACY_PREFIX) {
    incoming.pathname = "/";
    return incoming;
  }
  if (incoming.pathname.startsWith(LEGACY_PREFIX)) {
    const rest = incoming.pathname.slice(LEGACY_PREFIX.length).replace(/^\/+/, "");
    incoming.pathname = `/${rest}`;
    return incoming;
  }
  return incoming;
}

function applyAssetHeaders(pathname, response) {
  const headers = corsHeaders(new Headers(response.headers));
  if (pathname.endsWith(".ics")) {
    headers.set("Content-Type", "text/calendar; charset=utf-8");
    headers.set(
      "Cache-Control",
      "public, max-age=300, s-maxage=300, stale-while-revalidate=60, stale-if-error=86400",
    );
  } else if (pathname.endsWith(".json")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }
  headers.set("X-Calendar-Edge", "cloudflare-workers-assets");
  return headers;
}

export async function handleRequest(request, env, ctx) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (!ALLOWED_METHODS.has(request.method)) {
    return new Response("Method Not Allowed\n", {
      status: 405,
      headers: corsHeaders(new Headers({ Allow: "GET, HEAD, OPTIONS" })),
    });
  }

  const url = new URL(request.url);
  const normalizedUrl = resolveLegacyAssetPath(request.url);

  if (normalizedUrl.pathname === "/bundle.ics") {
    const parsed = parseBundleOptions(normalizedUrl.href);
    if (parsed.error) {
      return new Response(`${parsed.error}\n`, {
        status: 400,
        headers: corsHeaders(
          new Headers({
            "Cache-Control": "no-store",
            "Content-Type": "text/plain; charset=utf-8",
          }),
        ),
      });
    }

    const canonicalKeyUrl = new URL("https://apple-calendar.lili.uno/bundle.ics");
    canonicalKeyUrl.searchParams.set("_v", "2");
    canonicalKeyUrl.searchParams.set("feeds", parsed.slugs.join(","));
    canonicalKeyUrl.searchParams.set("name", parsed.name);
    canonicalKeyUrl.searchParams.set("color", parsed.color);
    if (parsed.remind) canonicalKeyUrl.searchParams.set("remind", parsed.remind);
    if (parsed.download) canonicalKeyUrl.searchParams.set("download", "1");

    const inm = request.headers.get("If-None-Match");
    const edgeCache = typeof caches !== "undefined" ? caches.default : null;
    const cacheRequest = new Request(canonicalKeyUrl.href, { method: "GET" });
    if (edgeCache) {
      const cached = await edgeCache.match(cacheRequest);
      if (cached) {
        const cachedEtag = cached.headers.get("ETag");
        if (cachedEtag && inm && (inm === cachedEtag || inm === `W/${cachedEtag}`)) {
          return new Response(null, { status: 304, headers: cached.headers });
        }
        if (request.method === "HEAD") {
          return new Response(null, { status: cached.status, headers: cached.headers });
        }
        return cached;
      }
    }

    if (!env?.ASSETS?.fetch) {
      return new Response("静态资源绑定未配置。\n", {
        status: 500,
        headers: corsHeaders(
          new Headers({
            "Cache-Control": "no-store",
            "Content-Type": "text/plain; charset=utf-8",
          }),
        ),
      });
    }

    const feedTexts = await Promise.all(
      parsed.slugs.map(async (slug) => {
        const assetUrl = new URL(`/${slug}.ics`, url.origin);
        const res = await env.ASSETS.fetch(new Request(assetUrl.href, { method: "GET" }));
        if (!res.ok) {
          throw new Error(`missing feed asset ${slug}.ics (${res.status})`);
        }
        return res.text();
      }),
    );

    const payloadText = synthesizeBundleIcs(feedTexts, parsed);
    const payloadBytes = encoder.encode(payloadText);
    const etag = await computeEtag(payloadBytes);

    const headers = corsHeaders(
      new Headers({
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control":
          "public, max-age=300, s-maxage=3600, stale-while-revalidate=600, stale-if-error=86400",
        ETag: etag,
        Vary: "Accept-Encoding",
        "X-Calendar-Edge": "cloudflare-bundle",
      }),
    );
    if (parsed.download) {
      headers.set("Content-Disposition", 'attachment; filename="china-calendar.ics"');
    }

    if (inm && (inm === etag || inm === `W/${etag}`)) {
      return new Response(null, { status: 304, headers });
    }

    const fullResponse = new Response(payloadBytes, { status: 200, headers });
    if (edgeCache && ctx?.waitUntil) {
      ctx.waitUntil(edgeCache.put(cacheRequest, fullResponse.clone()));
    }

    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }
    return fullResponse;
  }

  if (!env?.ASSETS?.fetch) {
    return new Response("Not Found\n", {
      status: 404,
      headers: corsHeaders(new Headers({ "Content-Type": "text/plain; charset=utf-8" })),
    });
  }

  const assetResponse = await env.ASSETS.fetch(
    new Request(normalizedUrl.href, {
      method: request.method === "HEAD" ? "GET" : request.method,
      headers: request.headers,
    }),
  );

  if (assetResponse.status === 404) {
    return new Response("未找到请求的日历或页面。\n", {
      status: 404,
      headers: corsHeaders(
        new Headers({
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=utf-8",
        }),
      ),
    });
  }

  const headers = applyAssetHeaders(normalizedUrl.pathname, assetResponse);
  return new Response(request.method === "HEAD" ? null : assetResponse.body, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers,
  });
}

export default {
  fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  },
};
