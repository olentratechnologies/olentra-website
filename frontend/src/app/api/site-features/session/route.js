import { NextResponse } from "next/server";
import { FEATURE_SESSION_COOKIE, issueFeatureSession, readFeatureSession, localFeatureDemo, requireSameOrigin, verifyFeatureCredentials, featureRequestOrigin } from "@/lib/server/site-feature-auth.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const attemptsKey = Symbol.for("olentra.site-feature-login-attempts");
export async function GET(request) { return NextResponse.json({ authenticated: Boolean(readFeatureSession(request)), localDemo: localFeatureDemo(request), mfaRequired: Boolean(process.env.OLENTRA_FEATURE_ADMIN_MFA_CODE) }, { headers }); }
export async function POST(request) {
  try { requireSameOrigin(request); } catch (error) { return NextResponse.json({ error: error.message }, { status: 403, headers }); }
  try {
    const body = await request.json(), local = body.localDemo === true && localFeatureDemo(request);
    const attempts = globalThis[attemptsKey] ||= new Map(), id = request.headers.get("x-forwarded-for") || "local", recent = (attempts.get(id) || []).filter(at => Date.now() - at < 60000);
    if (!local && recent.length >= 8) return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429, headers });
    if (!local && !verifyFeatureCredentials(body)) { attempts.set(id, [...recent, Date.now()]); return NextResponse.json({ error: "The website control credentials are incorrect or not configured." }, { status: 401, headers }); }
    attempts.delete(id);
    const response = NextResponse.json({ authenticated: true }, { headers });
    response.cookies.set(FEATURE_SESSION_COOKIE, issueFeatureSession(local ? "Local company owner" : body.email, local ? "local-demo" : "configured"), { httpOnly: true, sameSite: "strict", secure: new URL(featureRequestOrigin(request)).protocol === "https:", path: "/api/site-features", maxAge: 8 * 3600 });
    return response;
  } catch { return NextResponse.json({ error: "Provide valid website control credentials." }, { status: 400, headers }); }
}
export async function DELETE(request) {
  try { requireSameOrigin(request); } catch (error) { return NextResponse.json({ error: error.message }, { status: 403, headers }); }
  const response = NextResponse.json({ authenticated: false }, { headers }); response.cookies.set(FEATURE_SESSION_COOKIE, "", { path: "/api/site-features", maxAge: 0 }); return response;
}
