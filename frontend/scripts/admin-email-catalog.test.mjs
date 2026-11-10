import test from "node:test";
import assert from "node:assert/strict";
import {
  EMAIL_TEMPLATE_CATALOG,
  EMAIL_TEMPLATE_PRESETS,
  getEmailTemplateVariant,
  interpolateEmailText,
  renderEmailTemplate,
} from "../src/lib/admin/email-template-catalog.mjs";

const EXPECTED_TYPES = [
  "enquiry.received", "enquiry.acknowledgement", "enquiry.reply", "enquiry.followup", "enquiry.resolved",
  "account.registered", "account.signin-link", "account.password-reset", "account.password-changed",
  "application.received", "application.new-alert", "application.under-review", "application.shortlisted",
  "application.interview-stage", "application.selected", "application.rejected", "application.information-request",
  "offer.ready", "offer.accepted", "offer.declined", "onboarding.submitted", "onboarding.approved",
  "project.assigned", "project.updated", "task.assigned", "task.updated",
  "submission.received", "submission.approved", "submission.changes-requested",
  "internship.completed", "internship.status-updated", "certificate.issued", "certificate.revoked",
  "message.from-team", "message.from-intern", "announcement.program",
  "team.invitation", "team.invitation-accepted", "team.access-updated",
  "approval.requested", "approval.approved", "approval.rejected", "approval.changes-requested",
  "incident.alert", "incident.updated", "incident.resolved", "publishing.completed", "backup.created", "backup.restored",
];

test("catalog covers the agreed 49 events with 147 complete and distinct presets", () => {
  assert.deepEqual(EMAIL_TEMPLATE_CATALOG.map(type => type.id).sort(), [...EXPECTED_TYPES].sort());
  assert.deepEqual(EMAIL_TEMPLATE_PRESETS.map(preset => preset.id), ["professional", "warm", "minimal"]);
  assert.equal(EMAIL_TEMPLATE_CATALOG.filter(type => type.audience === "users").length, 29);
  assert.equal(EMAIL_TEMPLATE_CATALOG.filter(type => type.audience === "team").length, 20);
  const variantIds = new Set();
  for (const type of EMAIL_TEMPLATE_CATALOG) {
    for (const key of ["id", "title", "category", "recipient", "trigger"]) assert.ok(type[key]?.trim(), `${type.id}: missing ${key}`);
    assert.equal(type.variants.length, 3, type.id);
    assert.equal(new Set(type.variants.map(variant => variant.subject)).size, 3, `${type.id}: distinct subjects`);
    assert.equal(new Set(type.variants.map(variant => variant.preheader)).size, 3, `${type.id}: distinct preheaders`);
    assert.equal(new Set(type.variants.map(variant => variant.body.join("\n"))).size, 3, `${type.id}: distinct body copy`);
    for (const variant of type.variants) {
      assert.equal(variant.id, `${type.id}.${variant.presetId}`);
      assert.ok(!variantIds.has(variant.id), `duplicate variant ${variant.id}`);
      variantIds.add(variant.id);
      assert.equal(variant.label, EMAIL_TEMPLATE_PRESETS.find(preset => preset.id === variant.presetId).label);
      for (const key of ["subject", "preheader", "heading"]) assert.ok(variant[key]?.trim(), `${variant.id}: missing ${key}`);
      assert.ok(variant.body.length >= 2 && variant.body.every(paragraph => typeof paragraph === "string" && paragraph.trim()), variant.id);
      assert.ok(variant.cta.label?.trim() && variant.cta.url?.trim(), variant.id);
    }
  }
  assert.equal(variantIds.size, 147);
});

test("only the four audited senders are marked as existing emails", () => {
  assert.deepEqual(EMAIL_TEMPLATE_CATALOG.filter(type => type.deliveryStatus === "existing-email").map(type => type.id).sort(), [
    "account.password-reset", "account.signin-link", "application.received", "enquiry.received",
  ]);
  assert.ok(EMAIL_TEMPLATE_CATALOG.every(type => ["existing-email", "not-connected"].includes(type.deliveryStatus)));
});

test("all presets declare every token and render fully with fictional preview values", () => {
  for (const type of EMAIL_TEMPLATE_CATALOG) {
    const actualVariables = [...new Set([...JSON.stringify({ variants: type.variants, presentation: type.presentation }).matchAll(/\{\{([a-zA-Z][a-zA-Z0-9]*)\}\}/g)].map(match => match[1]))].sort();
    assert.deepEqual(type.variables, actualVariables, type.id);
    assert.deepEqual(Object.keys(type.sampleValues).sort(), actualVariables, type.id);
    for (const variable of type.variables) assert.ok(typeof type.sampleValues[variable] === "string" && type.sampleValues[variable].trim(), `${type.id}: missing sample ${variable}`);
    for (const variant of type.variants) {
      const rendered = renderEmailTemplate(type, variant);
      assert.ok(!JSON.stringify(rendered).includes("{{"), `${variant.id}: unresolved placeholder`);
      assert.ok(rendered.text.includes(rendered.subject) && rendered.text.includes(rendered.preheader));
      assert.ok(rendered.text.includes("contact@olentratechnologies.com"));
      assert.ok(rendered.text.includes("Olentra Technologies · Hyderabad, India"));
      assert.ok(rendered.body.every(paragraph => rendered.text.includes(paragraph)));
      const action = new URL(rendered.cta.url);
      assert.equal(action.protocol, "https:");
      assert.equal(action.hostname, "workspace.example.com");
      assert.ok(rendered.text.includes(`${rendered.cta.label}: ${rendered.cta.url}`));
    }
  }
});

test("professional fallback applies only to omitted selection; invalid selections remain invalid", () => {
  const type = EMAIL_TEMPLATE_CATALOG.find(item => item.id === "account.registered");
  assert.equal(getEmailTemplateVariant(type.id).id, "account.registered.professional");
  assert.equal(getEmailTemplateVariant(type.id, "account.registered.warm").presetId, "warm");
  for (const variantId of [null, "", "missing", "application.received.professional"]) {
    assert.equal(getEmailTemplateVariant(type.id, variantId), undefined);
  }
  assert.equal(getEmailTemplateVariant("missing"), undefined);
  assert.throws(() => renderEmailTemplate(type, getEmailTemplateVariant("application.received")), /belonging/);
});

test("interpolation is plain text, leaves unknown variables visible, and does not read inherited values", () => {
  const values = Object.assign(Object.create({ inherited: "must not substitute" }), { recipientName: "<img src=x onerror=alert(1)>", amount: 0 });
  assert.equal(interpolateEmailText("Hi {{recipientName}}; {{inherited}}; {{unknown}}; {{amount}}", values), "Hi <img src=x onerror=alert(1)>; {{inherited}}; {{unknown}}; 0");
  const type = EMAIL_TEMPLATE_CATALOG.find(item => item.id === "account.registered");
  const before = JSON.stringify(type);
  const rendered = renderEmailTemplate(type, type.variants[0], { ...type.sampleValues, recipientName: "Sam & Alex <preview>" });
  assert.equal(rendered.body[0], "Dear Sam & Alex <preview>,");
  assert.equal(JSON.stringify(type), before);
});

test("catalog, sample values, and variants are immutable", () => {
  assert.ok(Object.isFrozen(EMAIL_TEMPLATE_CATALOG));
  assert.ok(Object.isFrozen(EMAIL_TEMPLATE_PRESETS));
  const type = EMAIL_TEMPLATE_CATALOG[0];
  assert.ok(Object.isFrozen(type) && Object.isFrozen(type.sampleValues) && Object.isFrozen(type.variants[0].body));
  assert.ok(Object.isFrozen(type.presentation) && Object.isFrozen(type.presentation.details[0]));
  assert.throws(() => { type.variants[0].body.push("Modified"); }, TypeError);
});

test("every enterprise presentation has event-specific context and plain-text parity", () => {
  for (const type of EMAIL_TEMPLATE_CATALOG) {
    const metadata = type.presentation;
    for (const key of ["department", "eyebrow", "status", "summary"]) assert.ok(metadata[key]?.trim(), `${type.id}: missing ${key}`);
    assert.ok(["info", "success", "attention", "neutral"].includes(metadata.statusTone));
    assert.ok(metadata.reference.label?.trim() && metadata.reference.value?.trim());
    assert.ok(metadata.details.length >= 2 && metadata.details.every(item => item.label?.trim() && item.value?.trim()));
    assert.ok(Array.isArray(metadata.nextSteps) && metadata.nextSteps.every(step => step.trim()));
    assert.ok(metadata.notice === null || metadata.notice.title?.trim() && metadata.notice.body?.trim());
    assert.ok(metadata.signature.team.startsWith("Olentra ") && metadata.signature.role.trim());
    for (const variant of type.variants) {
      const { presentation, text } = renderEmailTemplate(type, variant);
      assert.ok(text.includes(presentation.summary));
      assert.ok(text.includes(`${presentation.reference.label}: ${presentation.reference.value}`));
      for (const item of presentation.details) assert.ok(text.includes(`${item.label}: ${item.value}`));
      for (const step of presentation.nextSteps) assert.ok(text.includes(step));
      if (presentation.notice) assert.ok(text.includes(presentation.notice.title) && text.includes(presentation.notice.body));
      assert.ok(text.includes(presentation.signature.team));
      assert.ok(!JSON.stringify(presentation).includes("{{"), `${type.id}: unresolved presentation values`);
    }
  }
  const reset = renderEmailTemplate(EMAIL_TEMPLATE_CATALOG.find(type => type.id === "account.password-reset"), getEmailTemplateVariant("account.password-reset"));
  assert.equal(reset.presentation.department, "Identity & Access");
  assert.equal(reset.presentation.details.find(item => item.label === "Link validity").value, "One hour");
  const review = renderEmailTemplate(EMAIL_TEMPLATE_CATALOG.find(type => type.id === "submission.changes-requested"), getEmailTemplateVariant("submission.changes-requested"));
  assert.equal(review.presentation.status, "Revision required");
  assert.ok(review.presentation.details.some(item => item.label === "Requested changes"));
});

test("sensitive lifecycle copy preserves distinctions and avoids misleading celebratory wording", () => {
  const content = id => {
    const type = EMAIL_TEMPLATE_CATALOG.find(item => item.id === id);
    return type.variants.map(variant => renderEmailTemplate(type, variant).text);
  };
  for (const text of content("account.registered")) assert.match(text, /separate|separately/i);
  for (const text of content("application.interview-stage")) assert.match(text, /separately/i);
  for (const text of content("account.password-reset")) assert.match(text, /one hour/i);
  for (const id of ["application.rejected", "certificate.revoked", "approval.rejected", "offer.declined"]) {
    for (const text of content(id)) assert.doesNotMatch(text, /congratulations|good news|celebrat/i);
  }
  for (const text of content("certificate.revoked")) assert.match(text, /no longer|stop using/i);
});
