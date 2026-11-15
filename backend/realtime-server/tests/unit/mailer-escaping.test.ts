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
    return new Response(JSON.stringify({ id: "email-1" }), { status: 200 });
  }) as typeof fetch;
  try {
    await send(createInternshipMailer("test-api-key", "Olentra <test@example.test>"));
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

test("confirmation email escapes the applicant name, track and link", async () => {
  const { html, text } = await capture(mailer => mailer.sendApplicationConfirmation({
    to: "a@example.test", name: hostile, programName: `Explorer "><script>x</script>`, magicLinkUrl: `https://example.test/v?token=a"b&c=1`,
  }));
  assertEscaped(html);
  assert.ok(!html.includes("<script>x</script>"));
  assert.match(html, /href="https:\/\/example\.test\/v\?token=a&quot;b&amp;c=1"/);
  assert.ok(text.includes(hostile), "the plain-text part is not HTML and keeps the original characters");
});

test("magic-link email escapes the name and link", async () => {
  const { html } = await capture(mailer => mailer.sendMagicLink({ to: "a@example.test", name: hostile, magicLinkUrl: "https://example.test/v?token=a&b", templateVariant: "professional" }));
  assertEscaped(html);
  assert.match(html, /href="https:\/\/example\.test\/v\?token=a&amp;b"/);
  assert.match(html, /background-color: #f2f5fb/);
  assert.match(html, /alt="Olentra Technologies"/);
  assert.match(html, /Open candidate portal/);
  assert.match(html, /Single-use link · Expires in 24 hours/);
  assert.match(html, /Use this secure sign-in link/);
});

test("each selected sign-in design changes the delivered subject and visual theme without losing security copy", async () => {
  const variants = [
    { id: "professional", subject: "Your Olentra Candidate Portal Sign-In Link", background: "#f2f5fb" },
    { id: "warm", subject: "Your requested Olentra sign-in link", background: "#fbf7f2" },
    { id: "minimal", subject: "Sign-in link for your Olentra account", background: "#ffffff" },
  ] as const;
  for (const variant of variants) {
    const { html, text, subject } = await capture(mailer => mailer.sendMagicLink({
      to: "a@example.test", name: "Alex", magicLinkUrl: "https://example.test/verify", templateVariant: variant.id,
    }));
    assert.equal(subject, variant.subject);
    assert.ok(html.includes(`background-color: ${variant.background}`));
    assert.match(html, /Single-use link · Expires in 24 hours/);
    assert.match(html, /If you didn’t request this link/);
    assert.match(text, /single-use link expires in 24 hours/);
  }
});

test("password reset email escapes the name and link", async () => {
  const { html } = await capture(mailer => mailer.sendPasswordResetLink({ to: "a@example.test", name: hostile, resetUrl: "https://example.test/r?token=a&b" }));
  assertEscaped(html);
  assert.match(html, /href="https:\/\/example\.test\/r\?token=a&amp;b"/);
});
