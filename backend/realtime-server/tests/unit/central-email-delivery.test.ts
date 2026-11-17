import { expect, test } from "bun:test";
import { createInternshipMailer } from "../../src/infrastructure/email/mailer";

test("internship delivery calls only the configured email-server and forwards calendar MIME bytes", async () => {
  const previous = globalThis.fetch;
  const requests: { url: string; headers: Headers; message: any }[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => { requests.push({ url: String(url), headers: new Headers(init?.headers), message: JSON.parse(String(init?.body)) }); return Response.json({ success: true, id: "central-smtp-id" }, { status: 201 }); }) as unknown as typeof fetch;
  try {
    const mailer = createInternshipMailer("server-only-token", "http://127.0.0.1:3001/");
    const response = await mailer.sendInterviewCancelled({ to: "intern@example.test", name: "Alex", programName: "Tech Explorer", scheduledAt: "2030-01-15T10:00:00.000Z", meetingUrl: "https://example.test/meeting", portalUrl: "https://example.test/intern/portal", interviewId: "INTV-1", sequence: 3 });
    expect(response).toMatchObject({ ok: true, delivered: true, id: "central-smtp-id" });
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("http://127.0.0.1:3001/api/email");
    expect(requests[0].headers.get("authorization")).toBe("Bearer server-only-token");
    expect(requests[0].message).not.toHaveProperty("from");
    expect(requests[0].message.attachments[0].contentType).toBe("text/calendar; charset=utf-8; method=CANCEL");
    expect(Buffer.from(requests[0].message.attachments[0].content, "base64").toString()).toContain("SEQUENCE:3");
  } finally { globalThis.fetch = previous; }
});

test("failed, unavailable or unacknowledged central delivery never reports success", async () => {
  const previous = globalThis.fetch;
  try {
    const mailer = createInternshipMailer("token", "http://email-server.test");
    for (const fake of [async () => new Response("Bad gateway", { status: 502 }), async () => Response.json({ id: "missing-success" }), async () => Response.json({ success: true }), async () => { throw new Error("socket timeout"); }]) {
      globalThis.fetch = fake as unknown as typeof fetch;
      expect(await mailer.sendMagicLink({ to: "intern@example.test", magicLinkUrl: "https://example.test/verify" })).toMatchObject({ ok: false, delivered: false });
    }
    globalThis.fetch = (async () => { throw new Error("Must not call without authentication"); }) as unknown as typeof fetch;
    expect(await createInternshipMailer("", "http://email-server.test").sendMagicLink({ to: "intern@example.test", magicLinkUrl: "https://example.test/verify" })).toMatchObject({ ok: false, delivered: false });
  } finally { globalThis.fetch = previous; }
});
