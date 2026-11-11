// Request-origin helpers for the website-controls API. Who may change switches
// is decided by the company workspace's staff-session check, not here.
export function featureRequestOrigin(request) {
  const requestUrl = new URL(request.url), protocol = (request.headers.get("x-forwarded-proto") || requestUrl.protocol.replace(":", "")).split(",")[0].trim();
  return process.env.OLENTRA_FEATURE_SITE_ORIGIN || new URL(protocol + "://" + (request.headers.get("host") || requestUrl.host)).origin;
}
export function requireSameOrigin(request) {
  const origin = request.headers.get("origin"), expected = featureRequestOrigin(request);
  if (!origin || origin !== expected || request.headers.get("sec-fetch-site") === "cross-site") throw new Error("Use the company dashboard on this website to change features.");
}
