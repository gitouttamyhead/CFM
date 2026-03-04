/**
 * Force HTML responses to have Content-Type: text/html so the browser
 * renders the page instead of showing raw source.
 */
import type { Config, Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  const isHtmlPath = path === "/search" || path === "/" || path.endsWith(".html");
  if (!isHtmlPath) {
    return context.next();
  }

  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";

  if (response.status !== 200 || contentType.includes("text/html")) {
    return response;
  }

  const body = await response.text();
  const headers = new Headers(response.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const config: Config = {
  path: "/*",
  excludedPath: ["/*.css", "/*.js", "/*.ico", "/*.json", "/*.png", "/*.jpg", "/*.svg", "/*.woff2"],
};
