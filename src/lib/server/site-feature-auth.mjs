import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
export const FEATURE_SESSION_COOKIE = "olentra_site_controls";
const key = Symbol.for("olentra.site-features.session-secret");
const secret = () => process.env.OLENTRA_FEATURE_SESSION_SECRET || (globalThis[key] ||= randomBytes(48).toString("hex"));
const credentialVersion = () => createHmac("sha256", secret()).update([process.env.OLENTRA_FEATURE_ADMIN_EMAIL || "owner@example.com", process.env.OLENTRA_FEATURE_ADMIN_PASSWORD || "", process.env.OLENTRA_FEATURE_ADMIN_MFA_CODE || ""].join("\n")).digest("base64url");
const equal = (a, b) => { const left = Buffer.from(String(a || "")), right = Buffer.from(String(b || "")); return left.length === right.length && timingSafeEqual(left, right); };
export function localFeatureDemo(request) {
  const hostname = new URL("http://" + (request.headers.get("host") || new URL(request.url).host)).hostname;
  const demoEnabled = process.env.OLENTRA_FEATURE_ALLOW_LOCAL_DEMO === "true" || process.env.NODE_ENV !== "production" && process.env.OLENTRA_FEATURE_ALLOW_LOCAL_DEMO !== "false";
  return demoEnabled && !process.env.OLENTRA_FEATURE_ADMIN_PASSWORD && ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}
export function featureRequestOrigin(request) {
  const requestUrl = new URL(request.url), protocol = (request.headers.get("x-forwarded-proto") || requestUrl.protocol.replace(":", "")).split(",")[0].trim();
  return process.env.OLENTRA_FEATURE_SITE_ORIGIN || new URL(protocol + "://" + (request.headers.get("host") || requestUrl.host)).origin;
}
export function requireSameOrigin(request) {
  const origin = request.headers.get("origin"), expected = featureRequestOrigin(request);
  if (!origin || origin !== expected || request.headers.get("sec-fetch-site") === "cross-site") throw new Error("Use the company dashboard on this website to change features.");
}
export function issueFeatureSession(email, mode = "configured") {
  const payload = Buffer.from(JSON.stringify({ email, mode, ...(mode === "configured" ? { version: credentialVersion() } : {}), expiresAt: Date.now() + 8 * 3600000 })).toString("base64url");
  return payload + "." + createHmac("sha256", secret()).update(payload).digest("base64url");
}
export function readFeatureSession(request) {
  const token = request.cookies?.get(FEATURE_SESSION_COOKIE)?.value;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !equal(signature, createHmac("sha256", secret()).update(payload).digest("base64url"))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString());
    if(!Number.isFinite(session.expiresAt)||session.expiresAt<=Date.now())return null;
    if(session.mode==="local-demo")return localFeatureDemo(request)?session:null;
    if(session.mode!=="configured"||(process.env.OLENTRA_FEATURE_ADMIN_PASSWORD||"").length<12||!equal(session.version,credentialVersion()))return null;
    return session;
  } catch { return null; }
}
export function verifyFeatureCredentials(body) {
  const password = process.env.OLENTRA_FEATURE_ADMIN_PASSWORD;
  if (!password || password.length < 12) return false;
  return equal(body.email?.toLowerCase(), (process.env.OLENTRA_FEATURE_ADMIN_EMAIL || "owner@example.com").toLowerCase()) && equal(body.password, password) && (!process.env.OLENTRA_FEATURE_ADMIN_MFA_CODE || equal(body.code, process.env.OLENTRA_FEATURE_ADMIN_MFA_CODE));
}
