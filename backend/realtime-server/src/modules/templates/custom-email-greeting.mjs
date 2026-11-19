export const CUSTOM_EMAIL_GREETING = "<!-- olentra:recipient-greeting -->Hello,";

export function normalizeCustomEmailName(value) {
  if (typeof value !== "string") return "";
  const name = value.replace(/\s+/g, " ").trim();
  return Array.from(name).slice(0, 120).join("").trimEnd();
}

/** Replaces the greeting in the HTML template for a single recipient. */
export function renderCustomEmailGreeting(body, recipientName) {
  const name = normalizeCustomEmailName(recipientName);
  const escaped = name.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
  return body.replace(CUSTOM_EMAIL_GREETING, () => escaped ? `Hello ${escaped},` : "Hello,");
}
