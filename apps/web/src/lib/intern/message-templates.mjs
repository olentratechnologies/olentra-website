/** Placeholders a message template can use, and where each value comes from. */
export const TEMPLATE_PLACEHOLDERS = [
  { key: "firstName", label: "First name" },
  { key: "fullName", label: "Full name" },
  { key: "track", label: "Track" },
  { key: "interviewTime", label: "Interview time" },
];

/** Values for one applicant. Missing values stay as visible placeholders. */
export function templateValues(application, interview) {
  const name = String(application?.name || "").trim();
  const at = interview?.scheduledAt ? new Date(interview.scheduledAt) : null;
  return {
    firstName: name.split(/\s+/)[0] || "",
    fullName: name,
    track: String(application?.program || ""),
    interviewTime: at && !Number.isNaN(at.getTime()) ? at.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "",
  };
}

/**
 * Replaces {placeholder} with its value. Unknown or empty placeholders are
 * left as written, so the sender can see what still needs filling in.
 * Messages are plain text, so values are inserted as-is.
 */
export function fillTemplate(text, values) {
  return String(text || "").replace(/\{(\w+)\}/g, (match, key) => (values && typeof values[key] === "string" && values[key] ? values[key] : match));
}
