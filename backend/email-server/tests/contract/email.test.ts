import { expect, test } from "bun:test";
import { createContactApp } from "../../src/app/create-app";
import type { EmailMessage, EmailSender } from "../../src/infrastructure/email/smtp.client";
const env = { port: 0, host: "127.0.0.1", deliveryToken: "internal-test-token" };
const payload = { to: ["intern@example.test"], subject: "Interview scheduled", text: "Your interview details", html: "<p>Details</p>", attachments: [{ filename: "interview.ics", content: Buffer.from("BEGIN:VCALENDAR\r\nMETHOD:REQUEST").toString("base64"), contentType: "text/calendar; charset=utf-8; method=REQUEST" }] };
const request = (data: any = payload, token = env.deliveryToken) => new Request("http://localhost/api/email", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(data) });

test("authenticated internal email delivery preserves HTML, text and calendar attachments", async () => {
  const received: EmailMessage[] = [];
  const app = createContactApp(env, async message => { received.push(message); return { id: "smtp-id" }; });
  const response = await app.handle(request());
  expect(response.status).toBe(201); expect(await response.json()).toEqual({ success: true, id: "smtp-id" });
  expect(received).toEqual([payload]);
  expect((await app.handle(request(payload, "wrong"))).status).toBe(401);
  expect(received).toHaveLength(1);
});

test("email endpoint fails closed and rejects invalid recipients, headers, attachments and oversized bodies", async () => {
  let sends = 0;
  const app = createContactApp(env, async () => { sends++; return { id: "smtp-id" }; });
  for (const invalid of [{ to: ["invalid"] }, { subject: "Hi\r\nBcc: victim@example.test" }, { attachments: [{ filename: "x", content: "not-base64!" }] }, { attachments: [{ filename: "x", content: "", path: "/etc/passwd" }] }, { attachments: [{ filename: "../secret", content: "" }] }, { replyTo: "bad\nheader" }, { text: {} }]) {
    expect((await app.handle(request({ ...payload, ...invalid }))).status).toBe(400);
  }
  const oversized = request(); Object.defineProperty(oversized, "headers", { value: new Headers({ authorization: "Bearer internal-test-token", "content-type": "application/json", "content-length": String(9 * 1024 * 1024) }) });
  expect((await app.handle(oversized)).status).toBe(413);
  expect((await createContactApp({ port: 0, host: "127.0.0.1" }).handle(request())).status).toBe(401);
  expect(sends).toBe(0);
});

test("SMTP failure cannot return a successful delivery acknowledgement", async () => {
  const send: EmailSender = async () => { throw new Error("SMTP authentication failed: private diagnostic"); };
  const response = await createContactApp(env, send).handle(request());
  expect(response.status).toBe(502);
  expect(await response.text()).not.toContain("private diagnostic");
  const missing = createContactApp(env);
  expect((await missing.handle(request())).status).toBe(503);
});
