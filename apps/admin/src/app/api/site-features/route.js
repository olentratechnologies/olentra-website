import { NextResponse } from "next/server";
import { readSiteFeatures, publicSiteFeatureState, setSiteFeature } from "@olentra/site-features/server/store";
import { readFeatureSession, requireSameOrigin } from "@olentra/site-features/server/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0" };
export async function GET() {
  try { return NextResponse.json(publicSiteFeatureState(await readSiteFeatures()), { headers }); }
  catch { return NextResponse.json({ error: "Website settings are temporarily unavailable." }, { status: 503, headers }); }
}
export async function PUT(request) {
  try { requireSameOrigin(request); } catch (error) { return NextResponse.json({ error: error.message }, { status: 403, headers }); }
  const session = readFeatureSession(request);
  if (!session) return NextResponse.json({ error: "Sign in to website controls to change live settings." }, { status: 401, headers });
  if (Number(request.headers.get("content-length") || 0) > 2048) return NextResponse.json({ error: "The update is too large." }, { status: 413, headers });
  try { return NextResponse.json(await setSiteFeature({ ...await request.json(), actor: session.email }), { headers }); }
  catch (error) { return NextResponse.json({ error: error.message }, { status: 400, headers }); }
}
