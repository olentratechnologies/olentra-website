import { NextResponse } from "next/server.js";
import { readSiteFeatures, publicSiteFeatureState, setSiteFeature } from "@olentra/site-features/server/store";
import { requireSameOrigin } from "@olentra/site-features/server/auth";
import { verifyStaffRequest } from "../../../lib/server/staff-session.js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0" };
const WEBSITE_CONTROL_ROLES = new Set(["Owner", "Administrator"]);

export async function GET() {
  try { return NextResponse.json(publicSiteFeatureState(await readSiteFeatures()), { headers }); }
  catch { return NextResponse.json({ error: "Website settings are temporarily unavailable." }, { status: 503, headers }); }
}

// Live website switches require a signed-in staff account with owner or
// administrator workspace access, verified with the account service.
export async function PUT(request) {
  try { requireSameOrigin(request); } catch (error) { return NextResponse.json({ error: error.message }, { status: 403, headers }); }
  if (Number(request.headers.get("content-length") || 0) > 2048) return NextResponse.json({ error: "The update is too large." }, { status: 413, headers });
  const staff = await verifyStaffRequest(request);
  if (staff.error) return NextResponse.json({ error: staff.error }, { status: staff.status, headers });
  if (!WEBSITE_CONTROL_ROLES.has(staff.role)) return NextResponse.json({ error: "Only workspace owners and administrators can change live website switches." }, { status: 403, headers });
  try { return NextResponse.json(await setSiteFeature({ ...await request.json(), actor: staff.account.email, token: (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") }), { headers }); }
  catch (error) { return NextResponse.json({ error: error.message }, { status: 400, headers }); }
}
