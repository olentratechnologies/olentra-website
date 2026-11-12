import test from "node:test";
import assert from "node:assert/strict";
import { createInternshipMailer } from "../../src/infrastructure/email/mailer";

const hostile = `<img src=x onerror=alert(1)>`;

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
  return { html: String(requests[0].html), text: String(requests[0].text) };
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
  const { html } = await capture(mailer => mailer.sendMagicLink({ to: "a@example.test", name: hostile, magicLinkUrl: "https://example.test/v?token=a&b" }));
  assertEscaped(html);
  assert.match(html, /href="https:\/\/example\.test\/v\?token=a&amp;b"/);
});

test("password reset email escapes the name and link", async () => {
  const { html } = await capture(mailer => mailer.sendPasswordResetLink({ to: "a@example.test", name: hostile, resetUrl: "https://example.test/r?token=a&b" }));
  assertEscaped(html);
  assert.match(html, /href="https:\/\/example\.test\/r\?token=a&amp;b"/);
});
