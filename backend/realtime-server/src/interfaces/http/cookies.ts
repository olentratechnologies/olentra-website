import { cookieName } from "./router";

export function safeContext(value: string | null): string | null {
  return value && /^[a-zA-Z0-9_-]{16,64}$/.test(value) ? value : null;
}

export function parseCookies(request: Request): Record<string, string> {
  return Object.fromEntries((request.headers.get("cookie") || "").split(";").flatMap(part => {
    const at = part.indexOf("=");
    if (at < 0) return [];
    return [[part.slice(0, at).trim(), decodeURIComponent(part.slice(at + 1).trim())]];
  }));
}

export function refreshCookie(request: Request, context: string, value: string, maxAge: number): string {
  const secure = new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  return `${cookieName(context)}=${encodeURIComponent(value)}; Path=/intern/auth; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}
