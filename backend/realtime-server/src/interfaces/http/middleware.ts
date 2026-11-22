export function createOriginGuard(origins: string[]) {
  const allowedOrigins = new Set(origins.map(value => value.toLowerCase()));
  return (origin: string | null) => !origin || allowedOrigins.has(origin.toLowerCase());
}

export function bearerToken(request: Request): string {
  return (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
}

export function requestId(request: Request): string {
  return request.headers.get("x-request-id") || crypto.randomUUID();
}

export const CORS_METHODS = "GET, POST, OPTIONS";
export const CORS_HEADERS = "Authorization, Content-Type, X-Intern-Context, X-Intern-Refresh-Request, X-File-Size, X-File-Name, X-File-Kind, X-File-Token, X-Resume-Grant, X-Resume-Challenge, Idempotency-Key";
