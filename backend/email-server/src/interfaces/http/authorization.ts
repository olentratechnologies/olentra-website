import { timingSafeEqual } from "node:crypto";
export function authorized(request: Request, token?: string) {
  if (!token) return false;
  const expected = Buffer.from(`Bearer ${token}`), supplied = Buffer.from(request.headers.get("authorization") || "");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
