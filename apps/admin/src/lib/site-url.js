// The public website is a separate app. Links from the workspace to public
// pages must target the website's origin, not the workspace's own.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export function siteUrl(path = "/") {
  if (!path || /^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith("//") || path.startsWith("#")) return path || SITE_URL + "/";
  return SITE_URL + (path.startsWith("/") ? path : "/" + path);
}
