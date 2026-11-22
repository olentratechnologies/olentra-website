import type { RateLimiter } from "../../modules/auth/rate-limit";
import { DomainError } from "../../shared/errors";

/** Public endpoint the apply form posts to (one plain HTTPS request, no WebSocket). */
export const APPLICATIONS_PATH = "/intern/applications";
export const MAX_APPLICATION_BODY_BYTES = 64 * 1024;

type SendJson = (body: unknown, origin: string | null, status?: number, extra?: Record<string, string>) => Response;
type Execute = (method: string, params: Record<string, unknown>, actor: null, key?: string) => Promise<unknown>;

export function createApplicationRoutes({ execute, limiter, sendJson }: { execute: Execute; limiter?: Pick<RateLimiter, "consume">; sendJson: SendJson }) {
  async function readBody(request: Request) {
    if (!/^application\/json\b/i.test(request.headers.get("content-type") || "")) throw new DomainError("INVALID_REQUEST", "Send the application as JSON.");
    if (Number(request.headers.get("content-length") || 0) > MAX_APPLICATION_BODY_BYTES) throw new DomainError("INVALID_REQUEST", "The application is too large.");
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_APPLICATION_BODY_BYTES) throw new DomainError("INVALID_REQUEST", "The application is too large.");
    let body: unknown;
    try { body = JSON.parse(text); } catch { throw new DomainError("INVALID_REQUEST", "The application could not be read."); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new DomainError("INVALID_REQUEST", "The application could not be read.");
    return body as Record<string, unknown>;
  }

  /** Same checks, limits and side effects as the WebSocket `application.submit`, over HTTP. */
  async function submit(request: Request, origin: string | null) {
    const key = request.headers.get("idempotency-key") || "";
    if (!key) throw new DomainError("INVALID_REQUEST", "Retry the application from the form.");
    const body = await readBody(request);
    const email = typeof body.email === "string" ? body.email : null;
    // Limited per email, not per IP, so a campus drive on one network isn't blocked.
    await limiter?.consume("apply", null, email);
    const data = await execute("application.submit", body, null, key);
    return sendJson({ ok: true, data }, origin);
  }

  return { submit };
}
