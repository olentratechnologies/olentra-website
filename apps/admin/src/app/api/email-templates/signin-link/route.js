import { NextResponse } from "next/server.js";
import { requireSameOrigin } from "@olentra/site-features/server/auth";
import { verifyStaffRequest } from "../../../../lib/server/staff-session.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const BACKEND_PATH = "/intern/email-template-selection";
const headers = { "Cache-Control": "no-store, max-age=0" };
const WEBSITE_CONTROL_ROLES = new Set(["Owner", "Administrator"]);
const backendUrl = () => (process.env.INTERNSHIP_BACKEND_URL || process.env.NEXT_PUBLIC_INTERNSHIP_BACKEND_URL || "http://127.0.0.1:3003").replace(/\/$/, "");

async function authorize(request, write = false) {
  if (write) {
    try { requireSameOrigin(request); }
    catch (error) { return { response: NextResponse.json({ error: error.message }, { status: 403, headers }) }; }
  }
  const staff = await verifyStaffRequest(request);
  if (staff.error) return { response: NextResponse.json({ error: staff.error }, { status: staff.status, headers }) };
  if (!WEBSITE_CONTROL_ROLES.has(staff.role)) return { response: NextResponse.json({ error: "Only workspace owners and administrators can manage live email templates." }, { status: 403, headers }) };
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return { token };
}

async function forward(method, token, body) {
  let response;
  try {
    response = await fetch(backendUrl() + BACKEND_PATH, {
      method,
      headers: { Authorization: "Bearer " + token, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return NextResponse.json({ error: "The email settings service is unavailable. Try again shortly." }, { status: 503, headers });
  }
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.ok !== true || !result.data) {
    const status = response.status >= 400 && response.status < 500 ? response.status : 503;
    return NextResponse.json({ error: result?.error?.message || "The email template could not be saved." }, { status, headers });
  }
  return NextResponse.json(result.data, { headers });
}

export async function GET(request) {
  const access = await authorize(request);
  return access.response || forward("GET", access.token);
}

export async function PUT(request) {
  const access = await authorize(request, true);
  if (access.response) return access.response;
  if (Number(request.headers.get("content-length") || 0) > 2048) return NextResponse.json({ error: "The selection is too large." }, { status: 413, headers });
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Choose a valid sign-in email design." }, { status: 400, headers }); }
  return forward("PUT", access.token, body);
}
