/**
 * Force HTML for /search and /search.html: fetch the file and return with
 * Content-Type: text/html so the browser renders instead of showing source.
 */
import type { Config, Context } from "@netlify/edge-functions";

const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8" };

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path !== "/search" && path !== "/search.html") {
    return context.next();
  }

  const targetUrl = new URL("/search.html", url.origin);
  const res = await fetch(targetUrl.toString());
  const body = await res.text();

  return new Response(body, {
    status: res.status,
    headers: HTML_HEADERS,
  });
};

export const config: Config = {
  path: ["/search", "/search.html"],
};
