import type { ResendEmail } from "../../domain/contact/types";

export async function sendResendEmail(
  send: typeof fetch,
  apiKey: string | undefined,
  email: ResendEmail,
): Promise<Response> {
  return send("https://api.resend.com/emails", {
    method: "POST",
    headers: apiKey
      ? { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }
      : { Authorization: "Bearer ", "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify(email),
  });
}
