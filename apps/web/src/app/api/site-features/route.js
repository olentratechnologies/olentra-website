import { NextResponse } from "next/server";
import { readSiteFeatures, publicSiteFeatureState } from "@olentra/site-features/server/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0" };
// The public website only reads feature switches; changing them (PUT) and the
// website-controls session live in the company workspace app (apps/admin).
export async function GET() {
  try { return NextResponse.json(publicSiteFeatureState(await readSiteFeatures()), { headers }); }
  catch { return NextResponse.json({ error: "Website settings are temporarily unavailable." }, { status: 503, headers }); }
}
