/**
 * Where an intern stands with the GitHub repositories shared on their projects.
 * One answer for the dashboard, the project cards and the project page.
 *
 * stage:
 *   "none"     no repository is shared with this intern
 *   "connect"  connect a GitHub account first
 *   "waiting"  connected; the invite is on its way
 *   "accept"   an invite is ready to accept on GitHub
 *   "granted"  access to every shared repository
 */
export function invitationUrl(url) {
  try {
    const parsed = new URL(url);
    const [owner, repo] = parsed.pathname.split("/").filter(Boolean);
    if (!/^(www\.)?github\.com$/i.test(parsed.hostname) || !owner || !repo) return null;
    return `https://github.com/${owner}/${repo.replace(/\.git$/i, "")}/invitations`;
  } catch {
    return null;
  }
}

export function repositoryAccess({ links = [], githubAccount = null, githubEnabled = false } = {}) {
  const repositories = (links || []).filter(link => link?.kind === "repository");
  const connected = Boolean(githubAccount?.login);
  const base = { repositories, connected, login: githubAccount?.login || "", automatic: githubEnabled && repositories.some(link => link.automatic) };
  if (!repositories.length) return { ...base, stage: "none", invite: null };
  if (repositories.every(link => link.myAccess === "granted")) return { ...base, stage: "granted", invite: null };
  // Connecting only helps when the site can send invites; otherwise a mentor adds the intern by hand.
  if (!connected && base.automatic) return { ...base, stage: "connect", invite: null };
  const invite = repositories.find(link => link.myAccess === "invited" && invitationUrl(link.url));
  if (invite) return { ...base, stage: "accept", invite: { ...invite, acceptUrl: invitationUrl(invite.url) } };
  return { ...base, stage: "waiting", invite: null };
}

/** The most urgent stage across several projects, for dashboard notices. */
export function portalRepositoryAccess(projects = [], githubAccount = null, githubEnabled = false) {
  const order = ["connect", "accept", "waiting", "granted", "none"];
  let best = { stage: "none", project: null };
  for (const project of projects || []) {
    const access = repositoryAccess({ links: project.links, githubAccount, githubEnabled });
    if (order.indexOf(access.stage) < order.indexOf(best.stage)) best = { ...access, project };
  }
  return best;
}

/** Remembered across the GitHub sign-in round trip so the intern returns to where they started. */
export const GITHUB_RETURN_KEY = "olentra-github-return";
export function safeReturnPath(value) {
  return typeof value === "string" && /^\/intern\/portal(\/[\w\-/#?=&.%]*)?$/.test(value) && !value.startsWith("/intern/portal/github") ? value : "";
}
