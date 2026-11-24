import { randomBytes } from "node:crypto";
import type { Collection } from "mongodb";
import { DomainError } from "../../shared/errors";
import type { Principal } from "../../shared/principal";
import type { InternshipRow } from "../../infrastructure/database/collections";
import { can } from "../access/policy";
import { GithubError, parseGithubRepo, type GithubApp } from "./github-app";
import { linkIsFor } from "../lifecycle/link-audience";

type Row = Record<string, any>;
/** GitHub repository invitations expire after seven days; send a fresh one after that. */
export const INVITE_TTL_MS = 7 * 86_400_000;
/** A single run never removes more than this many people; a larger drop is treated as a bug. */
export const MAX_REVOCATIONS_PER_RUN = 20;
const STATE_TTL_MS = 10 * 60_000;

type Desired = { key: string; owner: string; repo: string; applicationId: string; login: string; githubUserId: number };
type Logger = { warn: (message: string, fields?: Record<string, unknown>) => void; error: (message: string, fields?: Record<string, unknown>) => void };

/**
 * Keeps GitHub repository access in line with project teams. Each run compares
 * "active team members with a connected GitHub account" against the invites and
 * access this app has given, and fixes the difference. Only access recorded in
 * `github_grants` is ever removed, so people added by hand are never touched.
 */
export function createGithubAccess({ collection, github, now = Date.now, logger = console }: {
  collection: (name: string) => Collection<InternshipRow>;
  github: GithubApp | null;
  now?: () => number;
  logger?: Logger;
}) {
  const applications = collection("applications"), projects = collection("projects"), interns = collection("interns");
  const grants = collection("github_grants"), states = collection("github_states"), notifications = collection("notifications");
  const methods = new Set(["github.connectUrl", "github.connect", "github.disconnect", "github.resend", "github.repositories"]);
  let repositoryCache: { at: number; items: unknown[] } | null = null;

  async function initialize() {
    await Promise.all([
      states.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      grants.createIndex({ applicationId: 1 }),
      applications.createIndex({ "githubAccount.id": 1 }, { unique: true, partialFilterExpression: { "githubAccount.id": { $exists: true } } }),
    ]);
  }

  function requireIntern(actor: Principal | null) {
    if (actor?.role !== "intern" || !actor.applicationId) throw new DomainError("FORBIDDEN", "Sign in to your intern portal to connect GitHub.");
    return actor.applicationId;
  }
  function requireGithub() {
    if (!github) throw new DomainError("SERVICE_UNAVAILABLE", "GitHub access isn't set up yet. Your mentor will add you to the repository.");
    return github;
  }

  async function execute(method: string, p: Record<string, any>, actor: Principal | null) {
    if (method === "github.connectUrl") {
      const applicationId = requireIntern(actor), app = requireGithub();
      const state = randomBytes(24).toString("base64url");
      await states.insertOne({ _id: state, applicationId, expiresAt: new Date(now() + STATE_TTL_MS) });
      return { url: app.authorizeUrl(state) };
    }
    if (method === "github.connect") {
      const applicationId = requireIntern(actor), app = requireGithub();
      const state = typeof p.state === "string" ? p.state : "", code = typeof p.code === "string" ? p.code : "";
      if (!state || !code || code.length > 200) throw new DomainError("INVALID_REQUEST", "GitHub didn't send a sign-in code. Try connecting again.");
      const saved = await states.findOneAndDelete({ _id: state });
      if (!saved || saved.applicationId !== applicationId || saved.expiresAt.getTime() < now()) throw new DomainError("INVALID_REQUEST", "This GitHub sign-in expired. Try connecting again.");
      let user: { id: number; login: string };
      try { user = await app.verifyUser(code); }
      catch (error) { throw new DomainError("INVALID_REQUEST", error instanceof GithubError ? error.message : "GitHub sign-in failed. Try connecting again."); }
      const owner = await applications.findOne({ "githubAccount.id": user.id, _id: { $ne: applicationId } }, { projection: { _id: 1 } });
      if (owner) throw new DomainError("CONFLICT", "This GitHub account is already connected to another intern.");
      const current = await applications.findOne({ _id: applicationId }, { projection: { github: 1 } });
      const set: Row = { githubAccount: { id: user.id, login: user.login, connectedOn: new Date(now()).toISOString() } };
      if (!current?.github) set.github = `https://github.com/${user.login}`;
      await applications.updateOne({ _id: applicationId }, { $set: set });
      return { login: user.login, affectedApplications: [applicationId] };
    }
    if (method === "github.disconnect") {
      const applicationId = requireIntern(actor);
      await applications.updateOne({ _id: applicationId }, { $unset: { githubAccount: "" } });
      return { disconnected: true, affectedApplications: [applicationId] };
    }
    if (method === "github.repositories") {
      if (!can(actor, "projects.manage")) throw new DomainError("FORBIDDEN", "Your internship staff role does not allow this action.");
      if (!github) throw new DomainError("SERVICE_UNAVAILABLE", "GitHub isn't connected on this server yet. Paste the repository link instead.");
      const app = github;
      // A short cache keeps the picker fast; "refresh" picks up a repository created a moment ago.
      if (p.refresh === true || !repositoryCache || now() - repositoryCache.at > 60_000) {
        try { repositoryCache = { at: now(), items: await app.companyRepositories() }; }
        catch (error) {
          logger.warn("Listing GitHub repositories failed", { error: String(error) });
          throw new DomainError("SERVICE_UNAVAILABLE", "GitHub repositories couldn't be loaded. Try again, or paste the repository link instead.");
        }
      }
      return { repositories: repositoryCache.items, installUrl: `https://github.com/apps/${app.config.slug}/installations/new` };
    }
    if (method === "github.resend") {
      if (!can(actor, "projects.manage")) throw new DomainError("FORBIDDEN", "Your internship staff role does not allow this action.");
      requireGithub();
      const applicationId = typeof p.applicationId === "string" ? p.applicationId : "", projectId = typeof p.projectId === "string" ? p.projectId : "";
      const project = await projects.findOne({ _id: projectId, team: applicationId }, { projection: { links: 1 } });
      if (!project) throw new DomainError("NOT_FOUND", "This intern isn't on the project team.");
      const keys = (project.links || []).map((link: Row) => parseGithubRepo(link.url)).filter(Boolean).map((repo: any) => grantKey(repo.owner, repo.repo, applicationId));
      // Clearing invitedAt makes the next run send a fresh invite.
      const result = await grants.updateMany({ _id: { $in: keys }, status: { $in: ["invited", "error"] } }, { $set: { invitedAt: new Date(0) } });
      if (!result.modifiedCount) throw new DomainError("CONFLICT", "There is no open invite to resend.");
      return { resent: result.modifiedCount };
    }
    throw new DomainError("INVALID_REQUEST", "Unknown GitHub action.");
  }

  const grantKey = (owner: string, repo: string, applicationId: string) => `${owner}/${repo}#${applicationId}`;

  /** One reconciliation pass. Safe to run on several servers under a job lease. */
  async function reconcile() {
    if (!github) return { skipped: true };
    github.resetCache();
    const projectRows = await projects.find({ "links.kind": "repository" }, { projection: { team: 1, links: 1, name: 1 } }).toArray();
    const memberIds = [...new Set(projectRows.flatMap(project => project.team || []))];
    const [activeRows, accountRows, grantRows] = await Promise.all([
      interns.find({ applicationId: { $in: memberIds }, status: "Active" }, { projection: { applicationId: 1 } }).toArray(),
      applications.find({ _id: { $in: memberIds }, githubAccount: { $exists: true } }, { projection: { githubAccount: 1 } }).toArray(),
      grants.find({}).toArray(),
    ]);
    const active = new Set(activeRows.map(row => row.applicationId));
    const accounts = new Map(accountRows.map(row => [row._id, row.githubAccount]));
    const desired = new Map<string, Desired>();
    for (const project of projectRows) for (const link of project.links || []) {
      const repo = link.kind === "repository" ? parseGithubRepo(link.url) : null;
      if (!repo) continue;
      for (const applicationId of project.team || []) {
        const account = accounts.get(applicationId);
        if (!linkIsFor(link, applicationId) || !active.has(applicationId) || !account?.login) continue;
        const key = grantKey(repo.owner, repo.repo, applicationId);
        desired.set(key, { key, ...repo, applicationId, login: account.login, githubUserId: account.id });
      }
    }

    const installed = new Map<string, boolean>();
    async function isInstalled(owner: string, repo: string) {
      const key = `${owner}/${repo}`;
      if (!installed.has(key)) installed.set(key, await github!.installed(owner, repo).catch(error => { logger.warn("GitHub installation check failed", { repo: key, error: String(error) }); return false; }));
      return installed.get(key)!;
    }

    const byKey = new Map(grantRows.map(row => [row._id, row]));
    const stats = { invited: 0, granted: 0, revoked: 0, errors: 0 };

    // Remove what is no longer wanted, or what belongs to an old GitHub account.
    const stale = grantRows.filter(row => { const want = desired.get(row._id); return !want || want.githubUserId !== row.githubUserId; });
    const removable = stale.filter(row => row.status !== "preexisting");
    if (removable.length > MAX_REVOCATIONS_PER_RUN) {
      logger.error("GitHub access: too many removals in one run; skipped them", { count: removable.length });
    } else {
      for (const row of stale) {
        try {
          if (row.status !== "preexisting") {
            // Without the app on the repository we can't remove access; keep the record and retry later.
            if (!await isInstalled(row.owner, row.repo)) continue;
            if (row.status === "invited" && row.invitationId) await github.cancelInvite(row.owner, row.repo, row.invitationId);
            else if (row.status === "granted") await github.removeCollaborator(row.owner, row.repo, row.login);
            stats.revoked++;
          }
          await grants.deleteOne({ _id: row._id });
          byKey.delete(row._id);
        } catch (error) {
          stats.errors++;
          await grants.updateOne({ _id: row._id }, { $set: { lastError: String((error as Error).message || error).slice(0, 300), updatedAt: new Date(now()) } });
        }
      }
    }

    const newlyGranted: Desired[] = [];
    for (const want of desired.values()) {
      const row = byKey.get(want.key);
      if (row && row.githubUserId !== want.githubUserId) continue; // Old account still being removed.
      if (row?.status === "granted" || row?.status === "preexisting") continue;
      if (!await isInstalled(want.owner, want.repo)) continue;
      const base = { owner: want.owner, repo: want.repo, applicationId: want.applicationId, login: want.login, githubUserId: want.githubUserId, updatedAt: new Date(now()) };
      try {
        const member = await github.isCollaborator(want.owner, want.repo, want.login);
        if (member) {
          // Already a collaborator: if we never invited them, they were added by hand and stay untouched later.
          const status = row ? "granted" : "preexisting";
          await grants.updateOne({ _id: want.key }, { $set: { ...base, status, grantedAt: new Date(now()) }, $unset: { lastError: "" } }, { upsert: true });
          if (status === "granted") { stats.granted++; newlyGranted.push(want); }
          continue;
        }
        const expired = !row || row.status === "error" || now() - new Date(row.invitedAt || 0).getTime() > INVITE_TTL_MS;
        if (!expired) continue;
        const invitationId = await github.invite(want.owner, want.repo, want.login);
        await grants.updateOne({ _id: want.key }, invitationId === null
          ? { $set: { ...base, status: "granted", grantedAt: new Date(now()) }, $unset: { lastError: "" } }
          : { $set: { ...base, status: "invited", invitationId, invitedAt: new Date(now()) }, $unset: { lastError: "" } }, { upsert: true });
        if (invitationId === null) { stats.granted++; newlyGranted.push(want); } else stats.invited++;
      } catch (error) {
        stats.errors++;
        await grants.updateOne({ _id: want.key }, { $set: { ...base, status: "error", lastError: String((error as Error).message || error).slice(0, 300) } }, { upsert: true });
      }
    }

    await syncProjects(projectRows, desired, accounts, isInstalled);
    if (newlyGranted.length) await notifications.insertMany(newlyGranted.map(want => ({
      _id: `NTF-${randomBytes(9).toString("hex")}`, recipientRole: "intern", applicationId: want.applicationId,
      title: "Repository access granted", body: `You now have access to ${want.owner}/${want.repo} on GitHub.`, href: "/intern/portal/projects", createdOn: new Date(now()).toISOString(),
    })));
    if (stats.errors) logger.warn("GitHub access run finished with errors", stats);
    return stats;
  }

  /** Mirrors GitHub state into each repository link so the portal and dashboard show it. Writes only on change. */
  async function syncProjects(projectRows: Row[], desired: Map<string, Desired>, accounts: Map<string, Row>, isInstalled: (owner: string, repo: string) => Promise<boolean>) {
    const latest = new Map((await grants.find({}).toArray()).map(row => [row._id, row]));
    for (const project of projectRows) {
      // Links are addressed by id, not position, so a link edited meanwhile is never confused with another.
      const set: Row = {}, arrayFilters: Row[] = [];
      for (const [index, link] of (project.links || []).entries()) {
        const target = `links.$[l${index}]`;
        if (typeof link.id !== "string") continue;
        const repo = link.kind === "repository" ? parseGithubRepo(link.url) : null;
        if (!repo) continue;
        const appInstalled = await isInstalled(repo.owner, repo.repo);
        const before = Object.keys(set).length;
        if (link.github?.installed !== appInstalled) set[`${target}.github`] = { installed: appInstalled };
        for (const applicationId of project.team || []) {
          const key = grantKey(repo.owner, repo.repo, applicationId), grant = latest.get(key), account = accounts.get(applicationId);
          const previous = link.access?.[applicationId];
          let next: Row | null = null;
          if (desired.has(key) && grant) {
            const status = grant.status === "preexisting" ? "granted" : grant.status === "error" ? "pending" : grant.status;
            next = { status, source: "github", login: grant.login, ...(grant.lastError ? { error: grant.lastError } : {}) };
          } else if (previous?.source === "github") {
            // Disconnected or removed: fall back to pending so manual tracking can take over.
            next = { status: "pending", ...(account?.login ? { source: "github", login: account.login } : {}) };
          }
          if (!next) continue;
          const same = previous && ["status", "source", "login", "error"].every(field => (previous[field] ?? null) === (next![field] ?? null));
          if (!same) set[`${target}.access.${applicationId}`] = { ...next, updatedOn: new Date(now()).toISOString(), updatedBy: "github" };
        }
        if (Object.keys(set).length > before) arrayFilters.push({ [`l${index}.id`]: link.id });
      }
      if (Object.keys(set).length) await projects.updateOne({ _id: project._id }, { $set: set }, { arrayFilters });
    }
  }

  return { initialize, supports: (method: string) => methods.has(method), execute, reconcile, enabled: Boolean(github), installUrl: github ? `https://github.com/apps/${github.config.slug}/installations/new` : null };
}
