import { MongoError } from "mongodb";
import { DomainError } from "../../shared/errors";

export const cookieName = (context: string) => `intern_refresh_${context}`;

export function createCorsHeaders(origin: string | null, allowed: (origin: string | null) => boolean, extra: Record<string, string> = {}): Headers {
  const headers = new Headers(extra);
  if (origin && allowed(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }
  headers.set("Cache-Control", "no-store");
  return headers;
}

export function sendJson(body: unknown, origin: string | null, allowed: (origin: string | null) => boolean, status = 200, extra: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: createCorsHeaders(origin, allowed, extra) });
}

export function errorResult(error: unknown) {
  if (error instanceof DomainError) return { code: error.code, message: error.message };
  if (error instanceof MongoError) return { code: "SERVICE_UNAVAILABLE", message: "The internship database is temporarily unavailable. Please retry." };
  return { code: "INTERNAL", message: "The internship service is temporarily unavailable. Please retry." };
}

export function statusFor(error: unknown): number {
  if (error instanceof DomainError) {
    return ({ UNAUTHENTICATED: 401, RATE_LIMITED: 429, UNSUPPORTED_MEDIA_TYPE: 415, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, CLOSED: 409, INVALID_REQUEST: 400, INVALID_CLAIM: 400, ALREADY_APPLIED: 409 } as Record<string, number>)[error.code] || 400;
  }
  return error instanceof MongoError ? 503 : 500;
}
