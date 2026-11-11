import { NextResponse } from "next/server";
import { readSiteFeatures } from "@olentra/site-features/server/store";
import { siteRouteStatus } from "@olentra/site-features/rules";
import { featureRequestOrigin } from "@olentra/site-features/server/auth";

export async function proxy(request) {
  let state;
  try { state = await readSiteFeatures(); } catch { return new NextResponse("Website settings are temporarily unavailable.", { status: 503, headers: { "Cache-Control": "no-store" } }); }
  const status = siteRouteStatus(request.nextUrl.pathname, state.environments.Production);
  if (status === 200 && request.nextUrl.pathname.replace(/\/+$/, "") === "/intern") {
    const destination = new URL("/careers/intern", featureRequestOrigin(request));
    destination.search = request.nextUrl.search;
    const response = NextResponse.redirect(destination, 308);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }
  if (status === 200) { const response = NextResponse.next(); response.headers.set("Cache-Control", "no-store, max-age=0"); return response; }
  const title = status === 503 ? "We’ll be back soon" : "Page not found";
  return new NextResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} | Olentra Technologies</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070b12;color:#fff;font-family:Arial,sans-serif;text-align:center}main{max-width:480px;padding:32px}h1{font-size:40px}p{color:#aab8ce;line-height:1.6}a{display:inline-block;background:#2563eb;color:#fff;border-radius:24px;padding:13px 24px;text-decoration:none}</style></head><body><main><p>OLENTRA TECHNOLOGIES</p><h1>${title}</h1><p>${status === 503 ? "Our website is temporarily undergoing maintenance." : "This page is currently unavailable."}</p>${status === 404 ? '<a href="/">Back to home</a>' : ""}</main></body></html>`, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex", ...(status === 503 ? { "Retry-After": "300" } : {}) } });
}
export const config = { matcher: ["/((?!api|_next|favicon.ico|icon.png|apple-icon.png|images|fonts|videos|models|health).*)"] };
