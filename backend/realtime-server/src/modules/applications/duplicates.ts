/**
 * A comparable key for a LinkedIn profile URL: "linkedin.com/in/asha-rao".
 * Case, "www."/country subdomains, trailing slashes, query strings and
 * fragments are ignored. Returns "" when it isn't a profile link.
 */
export function linkedinKey(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  let url: URL;
  try { url = new URL(value.trim()); } catch { return ""; }
  if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) return "";
  const path = decodeURIComponent(url.pathname).toLowerCase().replace(/\/+$/, "");
  const match = /^\/(in|pub)\/([^/]+)/.exec(path);
  return match ? `linkedin.com/${match[1]}/${match[2]}` : "";
}
