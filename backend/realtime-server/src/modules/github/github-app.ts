import { createPrivateKey, createSign } from "node:crypto";

/**
 * Minimal GitHub App client. The app only needs the repository "Administration"
 * permission (to add and remove collaborators); it never reads code.
 */
export type GithubConfig = {
  appId: string;
  slug: string;
  clientId: string;
  clientSecret: string;
  privateKey: string;
  /** Where GitHub sends interns back after "Connect GitHub". */
  callbackUrl: string;
};

export type GithubFetch = (url: string, init?: RequestInit) => Promise<Response>;

export function readGithubConfig(env: NodeJS.ProcessEnv = process.env): GithubConfig | null {
  const appId = env.GITHUB_APP_ID?.trim(), slug = env.GITHUB_APP_SLUG?.trim(), clientId = env.GITHUB_APP_CLIENT_ID?.trim(), clientSecret = env.GITHUB_APP_CLIENT_SECRET?.trim();
  // Hosting dashboards often store multi-line keys with literal "\n".
  const privateKey = env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!appId || !slug || !clientId || !clientSecret || !privateKey) return null;
  const site = (env.INTERNSHIP_SITE_ORIGIN || env.INTERN_SITE_ORIGIN || env.SITE_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
  return { appId, slug, clientId, clientSecret, privateKey, callbackUrl: `${site}/intern/portal/github/callback` };
}

/** `https://github.com/owner/repo` (with optional .git or sub-path) → lower-case owner and repo. */
export function parseGithubRepo(url: unknown): { owner: string; repo: string } | null {
  if (typeof url !== "string") return null;
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  if (parsed.protocol !== "https:" || !/^(www\.)?github\.com$/i.test(parsed.hostname)) return null;
  const [owner, rawRepo] = parsed.pathname.split("/").filter(Boolean);
  const repo = rawRepo?.replace(/\.git$/i, "");
  if (!owner || !repo || !/^[A-Za-z0-9-]{1,39}$/.test(owner) || !/^[A-Za-z0-9._-]{1,100}$/.test(repo)) return null;
  return { owner: owner.toLowerCase(), repo: repo.toLowerCase() };
}

export class GithubError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = "GithubError"; }
}

const API = "https://api.github.com";
const base64url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

export function createGithubApp(config: GithubConfig, fetcher: GithubFetch = fetch, now: () => number = Date.now) {
  const key = createPrivateKey(config.privateKey);
  const installations = new Map<string, number | null>();
  const tokens = new Map<number, { token: string; expiresAt: number }>();

  function appJwt() {
    const issued = Math.floor(now() / 1000) - 60;
    const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(JSON.stringify({ iat: issued, exp: issued + 540, iss: config.appId }))}`;
    return `${unsigned}.${createSign("RSA-SHA256").update(unsigned).sign(key).toString("base64url")}`;
  }

  async function call(path: string, token: string, init: RequestInit = {}) {
    const response = await fetcher(`${API}${path}`, {
      ...init,
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "olentra-intern-access", Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
    });
    return response;
  }
  async function failure(response: Response, action: string): Promise<never> {
    const body = await response.json().catch(() => ({})) as { message?: string };
    throw new GithubError(`${action} failed (${response.status}${body.message ? `: ${body.message}` : ""})`, response.status);
  }

  /** The installation that covers this repository, or null when the app isn't installed there. */
  async function installation(owner: string, repo: string) {
    const cacheKey = `${owner}/${repo}`;
    if (installations.has(cacheKey)) return installations.get(cacheKey)!;
    const response = await call(`/repos/${owner}/${repo}/installation`, appJwt());
    if (response.status === 404) { installations.set(cacheKey, null); return null; }
    if (!response.ok) await failure(response, "Finding the GitHub App installation");
    const id = Number(((await response.json()) as { id?: number }).id);
    installations.set(cacheKey, id);
    return id;
  }
  async function installationToken(id: number) {
    const cached = tokens.get(id);
    if (cached && cached.expiresAt - now() > 5 * 60_000) return cached.token;
    const response = await call(`/app/installations/${id}/access_tokens`, appJwt(), { method: "POST" });
    if (!response.ok) await failure(response, "Getting a GitHub installation token");
    const body = await response.json() as { token: string; expires_at: string };
    tokens.set(id, { token: body.token, expiresAt: Date.parse(body.expires_at) || now() + 50 * 60_000 });
    return body.token;
  }
  async function repoToken(owner: string, repo: string) {
    const id = await installation(owner, repo);
    if (!id) throw new GithubError("The GitHub App isn't installed on this repository.", 404);
    return installationToken(id);
  }

  let ownerLogin: string | null = null;
  /** The account that owns this app (the company). Other accounts may install a public app; they are ignored. */
  async function owner() {
    if (ownerLogin) return ownerLogin;
    const response = await call("/app", appJwt());
    if (!response.ok) await failure(response, "Reading the GitHub App");
    ownerLogin = String(((await response.json()) as { owner?: { login?: string } }).owner?.login || "").toLowerCase();
    if (!ownerLogin) throw new GithubError("GitHub didn't return the app owner.", 502);
    return ownerLogin;
  }

  return {
    config,
    /** Repositories the app can manage in the company account, newest activity first. */
    async companyRepositories(maxPages = 10) {
      const company = await owner();
      const response = await call("/app/installations?per_page=100", appJwt());
      if (!response.ok) await failure(response, "Listing GitHub App installations");
      const list = await response.json() as { id: number; account?: { login?: string } }[];
      const ours = list.filter(item => String(item.account?.login || "").toLowerCase() === company);
      const repositories: GithubRepository[] = [];
      for (const item of ours) {
        const token = await installationToken(item.id);
        for (let page = 1; page <= maxPages; page++) {
          const result = await call(`/installation/repositories?per_page=100&page=${page}`, token);
          if (!result.ok) await failure(result, "Listing repositories");
          const body = await result.json() as { total_count?: number; repositories?: any[] };
          for (const repo of body.repositories || []) {
            if (String(repo.owner?.login || "").toLowerCase() !== company) continue;
            repositories.push({ fullName: repo.full_name, name: repo.name, owner: repo.owner.login, url: repo.html_url, private: Boolean(repo.private), archived: Boolean(repo.archived), description: typeof repo.description === "string" ? repo.description.slice(0, 500) : "", updatedAt: repo.pushed_at || repo.updated_at || null });
          }
          if ((body.repositories || []).length < 100) break;
        }
      }
      return repositories.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    },
    /** Forget cached installations so newly installed repositories are picked up. */
    resetCache() { installations.clear(); },
    installed: async (owner: string, repo: string) => Boolean(await installation(owner, repo)),
    async isCollaborator(owner: string, repo: string, login: string) {
      const response = await call(`/repos/${owner}/${repo}/collaborators/${encodeURIComponent(login)}`, await repoToken(owner, repo));
      if (response.status === 204) return true;
      if (response.status === 404) return false;
      return failure(response, "Checking repository access");
    },
    /** Returns the invitation id, or null when the user already had access. */
    async invite(owner: string, repo: string, login: string) {
      const response = await call(`/repos/${owner}/${repo}/collaborators/${encodeURIComponent(login)}`, await repoToken(owner, repo), { method: "PUT", body: JSON.stringify({ permission: "push" }) });
      if (response.status === 201) return Number(((await response.json()) as { id?: number }).id) || 0;
      if (response.status === 204) return null;
      return failure(response, "Sending the GitHub invite");
    },
    async cancelInvite(owner: string, repo: string, invitationId: number) {
      const response = await call(`/repos/${owner}/${repo}/invitations/${invitationId}`, await repoToken(owner, repo), { method: "DELETE" });
      if (response.status !== 204 && response.status !== 404) await failure(response, "Cancelling the GitHub invite");
    },
    async removeCollaborator(owner: string, repo: string, login: string) {
      const response = await call(`/repos/${owner}/${repo}/collaborators/${encodeURIComponent(login)}`, await repoToken(owner, repo), { method: "DELETE" });
      if (response.status !== 204 && response.status !== 404) await failure(response, "Removing repository access");
    },
    authorizeUrl(state: string) {
      const query = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.callbackUrl, state, allow_signup: "true" });
      return `https://github.com/login/oauth/authorize?${query}`;
    },
    /** Exchanges the sign-in code for the user's verified GitHub id and login. The user token is revoked right away. */
    async verifyUser(code: string) {
      const exchange = await fetcher("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "olentra-intern-access" },
        body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: config.callbackUrl }),
      });
      const grant = await exchange.json().catch(() => ({})) as { access_token?: string; error?: string };
      if (!exchange.ok || !grant.access_token) throw new GithubError("GitHub didn't confirm the sign-in. Try connecting again.", exchange.status || 400);
      try {
        const response = await call("/user", grant.access_token);
        if (!response.ok) await failure(response, "Reading your GitHub account");
        const user = await response.json() as { id?: number; login?: string };
        if (!user.id || !user.login) throw new GithubError("GitHub didn't return your account.", 502);
        return { id: user.id, login: user.login };
      } finally {
        // Best effort: the site keeps only the verified username, never the token.
        await fetcher(`${API}/applications/${config.clientId}/token`, {
          method: "DELETE",
          headers: { Accept: "application/vnd.github+json", "User-Agent": "olentra-intern-access", "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}` },
          body: JSON.stringify({ access_token: grant.access_token }),
        }).catch(() => {});
      }
    },
  };
}

export type GithubRepository = { fullName: string; name: string; owner: string; url: string; private: boolean; archived: boolean; description: string; updatedAt: string | null };
export type GithubApp = ReturnType<typeof createGithubApp>;
