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
    // India time first, with UTC alongside.
    assert.match(String(requests[0]?.text), /12 Nov 2026(,| at) 3:30\s?PM IST \(10:00 UTC\)/i);
    assert.match(String(requests[0]?.text), /https:\/\/example\.test\/intern\/portal/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("interview emails attach a calendar invite, and cancellations a matching cancel", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Record<string, any>[] = [];
  globalThis.fetch = (async (_input, init) => { requests.push(JSON.parse(String(init?.body))); return new Response(JSON.stringify({ id: "email-1" }), { status: 200 }); }) as typeof fetch;
  try {
    const mailer = createInternshipMailer("test-api-key", "Olentra <test@example.test>");
    const notice = { to: "intern@example.test", name: "<Test>", programName: "Tech Explorer", scheduledAt: "2026-11-12T10:00:00.000Z", meetingUrl: "https://meet.example.test/room", portalUrl: "https://example.test/intern/portal", interviewId: "INTV-9" };
    await mailer.sendInterviewScheduled({ ...notice, sequence: 1 });
    await mailer.sendInterviewCancelled({ ...notice, sequence: 2, cancelReason: "Interviewer unavailable" });
    const invite = Buffer.from(requests[0]!.attachments[0].content, "base64").toString();
    const cancel = Buffer.from(requests[1]!.attachments[0].content, "base64").toString();
    assert.match(invite, /METHOD:REQUEST/); assert.match(invite, /UID:INTV-9@/); assert.match(invite, /SEQUENCE:1/);
    assert.match(cancel, /METHOD:CANCEL/); assert.match(cancel, /UID:INTV-9@/); assert.match(cancel, /SEQUENCE:2/);
    assert.equal(requests[1]!.subject, "Your Tech Explorer interview was cancelled");
    assert.match(String(requests[1]!.html), /&lt;Test&gt;/);
    assert.match(String(requests[1]!.text), /Interviewer unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("the seven applicant journey emails share the branded responsive template", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_input, init) => {
    requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(JSON.stringify({ id: `email-${requests.length}` }), { status: 200 });
  }) as typeof fetch;

  try {
    const mailer = createInternshipMailer("test-api-key", "Olentra <test@example.test>");
    await mailer.sendApplicationConfirmation({
      to: "intern@example.test",
      name: "Test Intern",
      programName: "Tech Explorer",
      applicationId: "OL-123",
    });
    await mailer.sendApplicantStatus({
      to: "intern@example.test",
      name: "Test Intern",
      programName: "Tech Explorer",
      status: "shortlisted",
      portalUrl: "https://example.test/intern/portal",
    });
    await mailer.sendInterviewScheduled({
      to: "intern@example.test",
      name: "Test Intern",
      programName: "Tech Explorer",
      scheduledAt: "2026-11-12T10:00:00.000Z",
      meetingUrl: "https://meet.example.test/room",
      portalUrl: "https://example.test/intern/portal",
    });
    await mailer.sendApplicantStatus({
      to: "intern@example.test",
      name: "Test Intern",
      programName: "Tech Explorer",
      status: "selected",
      portalUrl: "https://example.test/intern/verify?token=secure",
      linkedinShareUrl: "https://www.linkedin.com/feed/?shareActive=true",
    });
    await mailer.sendApplicantStatus({
      to: "intern@example.test",
      name: "Test Intern",
      programName: "Tech Explorer",
      status: "offer",
      portalUrl: "https://example.test/intern/portal",
    });
    await mailer.sendApplicantStatus({
      to: "intern@example.test",
      name: "Test Intern",
      programName: "Tech Explorer",
      status: "onboarding",
      portalUrl: "https://example.test/intern/portal",
    });
    await mailer.sendApplicantStatus({
      to: "intern@example.test",
      name: "Test Intern",
      programName: "Tech Explorer",
      status: "certificate",
      portalUrl: "https://example.test/intern/portal",
      certificateVerifyUrl: "https://example.test/certificates/verify/OLENTRA-123",
      linkedinShareUrl: "https://www.linkedin.com/sharing/share-offsite/?url=certificate",
    });

    assert.equal(requests.length, 7);
    for (const request of requests) {
      const html = String(request.html);
      assert.match(html, /max-width:620px/);
      assert.match(html, /alt="Olentra Technologies"/);
      assert.match(html, /Automated message about your internship application or program/);
      assert.match(html, /background:#f3f6fb/);
    }
    assert.match(String(requests[0]?.html), /OL-123/);
    assert.match(String(requests[3]?.html), /Share on LinkedIn/);
    assert.match(String(requests[6]?.html), /Verify your certificate/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reminder emails escape their content and link to the site", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Record<string, any>[] = [];
  globalThis.fetch = (async (_input, init) => { requests.push(JSON.parse(String(init?.body))); return new Response(JSON.stringify({ id: "email-1" }), { status: 200 }); }) as typeof fetch;
  try {
    const mailer = createInternshipMailer("test-api-key", "Olentra <test@example.test>");
    await mailer.sendNotice({ to: "a@example.test", subject: "2 applications are waiting", heading: "Waiting", intro: "Hi", items: ["<b>Asha</b> · Tech Explorer", "Ravi · Tech Innovator"], ctaLabel: "Review", ctaUrl: "https://site.example.test/intern/dashboard/applications" });
    assert.match(String(requests[0]!.html), /&lt;b&gt;Asha&lt;\/b&gt;/);
    assert.match(String(requests[0]!.html), /href="https:\/\/site\.example\.test\/intern\/dashboard\/applications"/);
    assert.match(String(requests[0]!.text), /- Ravi · Tech Innovator/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
