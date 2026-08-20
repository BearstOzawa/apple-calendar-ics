const UPSTREAM_ORIGIN = "https://bearstozawa.github.io";
const UPSTREAM_PREFIX = "/apple-calendar-ics/";
const PUBLIC_ALIAS_PREFIX = "/apple-calendar-ics/";
const ALLOWED_METHODS = new Set(["GET", "HEAD"]);
const FORWARDED_HEADERS = [
  "accept",
  "if-modified-since",
  "if-none-match",
  "range",
];

function corsHeaders(headers = new Headers()) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "If-Modified-Since, If-None-Match, Range",
  );
  headers.set(
    "Access-Control-Expose-Headers",
    "ETag, Last-Modified, Content-Range",
  );
  return headers;
}

export function upstreamUrlFor(requestUrl) {
  const incoming = new URL(requestUrl);
  let relativePath;
  if (
    incoming.pathname === "/apple-calendar-ics" ||
    incoming.pathname === PUBLIC_ALIAS_PREFIX
  ) {
    relativePath = "";
  } else if (incoming.pathname.startsWith(PUBLIC_ALIAS_PREFIX)) {
    relativePath = incoming.pathname.slice(PUBLIC_ALIAS_PREFIX.length);
  } else {
    relativePath = incoming.pathname.replace(/^\/+/, "");
  }

  const upstream = new URL(UPSTREAM_ORIGIN);
  upstream.pathname = `${UPSTREAM_PREFIX}${relativePath}`;
  upstream.search = incoming.search;
  return upstream;
}

function cacheControlFor(pathname, status) {
  if (status < 200 || status >= 400) return "no-store";
  const isCalendarData =
    pathname.endsWith(".ics") || pathname.endsWith("manifest.json");
  const maxAge = isCalendarData ? 300 : 3600;
  return `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=60, stale-if-error=86400`;
}

function contentTypeFor(pathname, fallback) {
  if (pathname.endsWith(".ics")) return "text/calendar; charset=utf-8";
  if (pathname.endsWith("manifest.json")) return "application/json; charset=utf-8";
  return fallback;
}

export async function proxyRequest(request, upstreamFetch = fetch) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (!ALLOWED_METHODS.has(request.method)) {
    return new Response("Method Not Allowed\n", {
      status: 405,
      headers: corsHeaders(new Headers({ Allow: "GET, HEAD, OPTIONS" })),
    });
  }

  const upstreamUrl = upstreamUrlFor(request.url);
  const upstreamHeaders = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) upstreamHeaders.set(name, value);
  }
  upstreamHeaders.set("User-Agent", "apple-calendar-cloudflare-proxy/1.0");

  let upstreamResponse;
  try {
    upstreamResponse = await upstreamFetch(upstreamUrl, {
      method: request.method,
      headers: upstreamHeaders,
      redirect: "follow",
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: {
          "200-299": 300,
          404: 60,
          "500-599": 0,
        },
      },
    });
  } catch {
    return new Response("日历源站暂时不可用，请稍后重试。\n", {
      status: 502,
      headers: corsHeaders(
        new Headers({
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": "60",
        }),
      ),
    });
  }

  const headers = corsHeaders(new Headers(upstreamResponse.headers));
  headers.set(
    "Cache-Control",
    cacheControlFor(upstreamUrl.pathname, upstreamResponse.status),
  );
  const contentType = contentTypeFor(
    upstreamUrl.pathname,
    headers.get("Content-Type"),
  );
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("X-Calendar-Proxy", "cloudflare");
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(request.method === "HEAD" ? null : upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}

export default {
  fetch(request) {
    return proxyRequest(request);
  },
};
