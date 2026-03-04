/**
 * Force HTML for /search and /search.html: rewrite to search.html, get response
 * via context.next(), then return body with Content-Type: text/html.
 * (Using fetch() caused 508 loop; next() avoids re-invoking this function.)
 */
import type { Config, Context } from "@netlify/edge-functions";

const HTML_TYPE = "text/html; charset=utf-8";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path !== "/search" && path !== "/search.html") {
    return context.next();
  }

  const rewritten = new Request(new URL("/search.html", url.origin), request);
  const response = await context.next(rewritten);
  const body = await response.text();
  const headers = new Headers(response.headers);
  headers.set("Content-Type", HTML_TYPE);

  return new Response(body, { status: response.status, headers });
};

export const config: Config = {
  path: ["/search", "/search.html"],
};
