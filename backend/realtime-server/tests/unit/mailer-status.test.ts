import test from "node:test";
import assert from "node:assert/strict";
import { createInternshipMailer } from "../../src/infrastructure/email/mailer";

test("applicant status emails include the portal and certificate sharing links", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_input, init) => {
    requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(JSON.stringify({ id: "email-1" }), { status: 200 });
  }) as typeof fetch;

  try {
    const mailer = createInternshipMailer("test-api-key", "Olentra <test@example.test>");
    const result = await mailer.sendApplicantStatus({
      to: "intern@example.test",
      name: "<Test Intern>",
      programName: "Tech Explorer",
      status: "certificate",
      portalUrl: "https://example.test/intern/portal",
      certificateVerifyUrl: "https://example.test/certificates/verify/OLENTRA-123",
      linkedinShareUrl: "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexample.test%2Fverify",
    });

    assert.equal(result.ok, true);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].subject, "Your Olentra internship certificate is ready");
    assert.match(String(requests[0].html), /&lt;Test Intern&gt;/);
    assert.match(String(requests[0].html), /https:\/\/example\.test\/certificates\/verify\/OLENTRA-123/);
    assert.match(String(requests[0].html), /linkedin\.com\/sharing\/share-offsite/);
    assert.match(String(requests[0].text), /https:\/\/example\.test\/intern\/portal/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("shortlisted applicant emails have a distinct status subject and portal link", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_input, init) => {
    requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(JSON.stringify({ id: "email-2" }), { status: 200 });
  }) as typeof fetch;

  try {
    const mailer = createInternshipMailer("test-api-key", "Olentra <test@example.test>");
    await mailer.sendApplicantStatus({
      to: "intern@example.test",
      name: "Test Intern",
      programName: "Tech Explorer",
      status: "shortlisted",
      portalUrl: "https://example.test/intern/portal",
    });
    assert.equal(requests[0]?.subject, "You’ve been shortlisted at Olentra");
    assert.match(String(requests[0]?.text), /candidate portal/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("interview emails include the time, meeting link, and candidate portal", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_input, init) => {
    requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(JSON.stringify({ id: "email-interview" }), { status: 200 });
  }) as typeof fetch;

  try {
    const mailer = createInternshipMailer("test-api-key", "Olentra <test@example.test>");
    await mailer.sendInterviewScheduled({
      to: "intern@example.test",
      name: "Test Intern",
      programName: "Tech Explorer",
      scheduledAt: "2026-11-12T10:00:00.000Z",
      meetingUrl: "https://meet.example.test/room",
      portalUrl: "https://example.test/intern/portal",
    });
    assert.equal(requests[0]?.subject, "Interview scheduled for your Tech Explorer application");
    assert.match(String(requests[0]?.html), /https:\/\/meet\.example\.test\/room/);
    assert.match(String(requests[0]?.text), /2026-11-12 10:00 UTC/);
    assert.match(String(requests[0]?.text), /https:\/\/example\.test\/intern\/portal/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
