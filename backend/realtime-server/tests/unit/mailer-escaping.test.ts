import test from "node:test";
import assert from "node:assert/strict";
import { createInternshipMailer } from "../../src/infrastructure/email/mailer";

const hostile = `<img src=x onerror=alert(1)>`;

test("missing production email configuration cannot acknowledge delivery", async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const result = await createInternshipMailer("").sendMagicLink({ to: "a@example.test", magicLinkUrl: "https://example.test/verify" });
    assert.equal(result.ok, false);
    assert.equal(result.delivered, false);
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});

async function capture(send: (mailer: ReturnType<typeof createInternshipMailer>) => Promise<unknown>) {
  const originalFetch = globalThis.fetch;
  const requests: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_input, init) => {
    requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(JSON.stringify({ success: true, id: "email-1" }), { status: 200 });
  }) as typeof fetch;
  try {
    await send(createInternshipMailer("delivery-test-token", "http://email-server.test"));
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(requests.length, 1);
  return { html: String(requests[0].html), text: String(requests[0].text), subject: String(requests[0].subject) };
}

function assertEscaped(html: string) {
  assert.ok(!html.includes(hostile), "raw markup from the applicant must not reach the HTML");
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
}

test("confirmation email escapes the applicant name and track and never includes a login link", async () => {
  const { html, text } = await capture(mailer => mailer.sendApplicationConfirmation({
    to: "a@example.test", name: hostile, programName: `Internship "><script>x</script>`, magicLinkUrl: `https://example.test/v?token=a"b&c=1`,
  }));
  assertEscaped(html);
  assert.ok(!html.includes("<script>x</script>"));
  assert.doesNotMatch(html, /example.test\/v|secure portal link/);
  assert.ok(text.includes(hostile), "the plain-text part is not HTML and keeps the original characters");
});

test("magic-link email escapes the name and link", async () => {
  const { html } = await capture(mailer => mailer.sendMagicLink({ to: "a@example.test", name: hostile, magicLinkUrl: "https://example.test/v?token=a&b", templateVariant: "professional" }));
  assertEscaped(html);
  assert.match(html, /href="https:\/\/example\.test\/v\?token=a&amp;b"/);
  assert.match(html, /background:#f3f6fb/);
  assert.match(html, /alt="Olentra Technologies"/);
  assert.match(html, /Open candidate portal/);
  assert.match(html, /Single-use link · Expires in 24 hours/);
  assert.match(html, /Use this secure sign-in link/);
});

test("saved sign-in copy changes delivery while required security details stay present", async () => {
  const originalFetch = globalThis.fetch;
  const requests: any[] = [];
  globalThis.fetch = (async (_input, init) => { requests.push(JSON.parse(String(init?.body))); return new Response(JSON.stringify({ success: true, id: "email" }), { status: 200 }); }) as typeof fetch;
  try {
    const mailer = createInternshipMailer("delivery-test-token", "http://email-server.test", async () => ({ subject: "Welcome back, {fullName}", body: "Your requested access, {fullName}." }));
    await mailer.sendMagicLink({ to: "a@example.test", name: "Alex", magicLinkUrl: "https://example.test/verify" });
    assert.equal(requests[0].subject, "Welcome back, Alex");
    assert.match(requests[0].html, /Your requested access, Alex/);
    assert.match(requests[0].html, /Single-use link · Expires in 24 hours/);
    assert.match(requests[0].html, /If you didn’t request this link/);
    assert.match(requests[0].text, /https:\/\/example.test\/verify/);
  } finally { globalThis.fetch = originalFetch; }
});

test("password reset email escapes the name and link", async () => {
  const { html } = await capture(mailer => mailer.sendPasswordResetLink({ to: "a@example.test", name: hostile, resetUrl: "https://example.test/r?token=a&b" }));
  assertEscaped(html);
  assert.match(html, /href="https:\/\/example\.test\/r\?token=a&amp;b"/);
});
