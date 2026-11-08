import { SignJWT, jwtVerify } from "jose";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import type { Document } from "mongodb";
import { DomainError, type Principal } from "./domain";
import type { createInternshipDomain } from "./domain";

const ACCESS_SECONDS = 15 * 60;
const REFRESH_SECONDS = 7 * 24 * 60 * 60;
const MAGIC_LINK_SECONDS = 24 * 60 * 60;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const random = () => randomBytes(32).toString("base64url");

export function createInternshipAuth(domain: ReturnType<typeof createInternshipDomain>, secret: string) {
  if (Buffer.byteLength(secret) < 32) throw new Error("INTERN_JWT_SECRET must contain at least 32 bytes.");
  const key = new TextEncoder().encode(secret);
  const refreshKey = createHash("sha256").update("olentra-intern-refresh-retry-v1\0").update(secret).digest();
  const sessions = domain.collection("sessions");
  const verifiedTokenCache = new Map<string, { payload: Awaited<ReturnType<typeof jwtVerify>>["payload"]; expiresAt: number }>();

  async function initialize() {
    await Promise.all([
      sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      sessions.createIndex({ _id: 1, userId: 1, revoked: 1, expiresAt: 1 }),
      sessions.createIndex({ _id: 1, refreshHash: 1, revoked: 1 }),
    ]);
  }
  async function resolveSession(match: Document): Promise<{ row: Document; account: Principal | null } | null> {
    const [row] = await sessions.aggregate([
      { $match: match },
      { $lookup: { from: domain.collection("accounts").collectionName, localField: "userId", foreignField: "_id", pipeline: [{ $match: { disabled: { $ne: true } } }, { $project: { name: 1, email: 1, role: 1, applicationId: 1, sessionVersion: 1, staffRole: 1 } }], as: "account" } },
      { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
    ], { readPreference: "primary" }).toArray();
    if (!row) return null;
    const user = row.account;
    if (!user || (user.role !== "intern" && user.role !== "company")) return { row, account: null };
    let staffRole: { id: string; permissions?: readonly string[] } | null = null;
    if (user.role === "company") {
      if (typeof user.staffRole !== "string") return { row, account: null };
      staffRole = (domain as any).resolveRoleSync?.(user.staffRole) || await (domain as any).resolveRole(user.staffRole);
      if (!staffRole || staffRole.id !== user.staffRole) return { row, account: null };
    }
    const account: Principal = { id: user._id, name: user.name, email: user.email, role: user.role, applicationId: user.applicationId ?? null, sessionVersion: user.sessionVersion ?? 1, ...(user.role === "company" && staffRole ? { staffRole: user.staffRole, permissions: [...(staffRole.permissions || [])] } : {}) };
    return { row, account };
  }
  async function access(account: Principal, sid: string) {
    const now = Math.floor(Date.now() / 1000);
    return { token: await new SignJWT({ sid, role: account.role, ver: account.sessionVersion }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setIssuer("olentra-intern").setAudience("olentra-intern-client").setSubject(account.id).setIssuedAt(now).setExpirationTime(now + ACCESS_SECONDS).setJti(randomUUID()).sign(key), expiresAt: (now + ACCESS_SECONDS) * 1000 };
  }
  async function createSessionForAccount(account: Principal) {
    const sid = randomUUID(), refresh = random();
    await sessions.insertOne({ _id: sid, userId: account.id, version: account.sessionVersion, refreshHash: digest(refresh), expiresAt: new Date(Date.now() + REFRESH_SECONDS * 1000), revoked: false });
    return { account, ...(await access(account, sid)), refreshToken: `${sid}.${refresh}` };
  }
  async function login(email: string, password: string) {
    const account = await domain.login(email, password);
    if (!account) throw new DomainError("UNAUTHENTICATED", "Email or password is incorrect.");
    return createSessionForAccount(account);
  }
  async function generateMagicLinkToken(email: string, applicationId: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({ aid: applicationId })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer("olentra-intern-magic")
      .setAudience("olentra-intern-portal")
      .setSubject(email.trim().toLowerCase())
      .setIssuedAt(now)
      .setExpirationTime(now + MAGIC_LINK_SECONDS)
      .setJti(randomUUID())
      .sign(key);
  }
  async function verifyMagicLinkToken(token: string): Promise<{ email: string; applicationId: string }> {
    try {
      const { payload } = await jwtVerify(token, key, {
        algorithms: ["HS256"],
        issuer: "olentra-intern-magic",
        audience: "olentra-intern-portal",
      });
      if (typeof payload.sub !== "string" || typeof payload.aid !== "string") {
        throw new DomainError("UNAUTHENTICATED", "This sign-in link is invalid or has expired.");
      }
      return { email: payload.sub, applicationId: payload.aid };
    } catch (err: any) {
      if (err instanceof DomainError) throw err;
      throw new DomainError("UNAUTHENTICATED", "This sign-in link is invalid or has expired.");
    }
  }
  async function verify(token: string) {
    let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"];
    const nowSec = Math.floor(Date.now() / 1000);
    const cached = verifiedTokenCache.get(token);
    if (cached && cached.expiresAt > nowSec) {
      payload = cached.payload;
    } else {
      try { ({ payload } = await jwtVerify(token, key, { algorithms: ["HS256"], issuer: "olentra-intern", audience: "olentra-intern-client" })); }
      catch { throw new DomainError("UNAUTHENTICATED", "Your session has expired. Sign in again."); }
      if (typeof payload.exp === "number" && payload.exp > nowSec) {
        if (verifiedTokenCache.size > 2000) verifiedTokenCache.clear();
        verifiedTokenCache.set(token, { payload, expiresAt: Math.min(payload.exp, nowSec + 60) });
      }
    }
    if (typeof payload.sid !== "string" || typeof payload.sub !== "string") throw new DomainError("UNAUTHENTICATED", "Your session has expired. Sign in again.");
    // Resolve the session, account and current staff permissions in one
    // database round trip.
    const found = await resolveSession({ _id: payload.sid, userId: payload.sub, revoked: false, expiresAt: { $gt: new Date() } });
    const account = found?.account;
    if (!account || found.row.version !== account.sessionVersion || payload.ver !== account.sessionVersion || payload.role !== account.role) {
      verifiedTokenCache.delete(token);
      throw new DomainError("UNAUTHENTICATED", "Your session has expired. Sign in again.");
    }
    return { account, sessionId: payload.sid };
  }
  async function refresh(value: string, requestId?: string | null) {
    const parts = value.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) throw new DomainError("UNAUTHENTICATED", "Sign in again.");
    if (requestId && !/^[A-Za-z0-9_-]{16,128}$/.test(requestId)) throw new DomainError("INVALID_REQUEST", "Invalid refresh request ID.");
    const [sid, old] = parts as [string, string];
    const previousHash = digest(old);
    const next = requestId ? createHmac("sha256", refreshKey).update(sid).update("\0").update(old).update("\0").update(requestId).digest("base64url") : random();
    const recoverOrReject = async () => {
      // A response may be lost after the rotation committed. Only an exact
      // retry of the same request can recover the same successor briefly;
      // different request IDs still trigger refresh-token replay revocation.
      const prior = requestId && await resolveSession({ _id: sid, previousHash, refreshRetryHash: digest(requestId), refreshRetryUntil: { $gt: new Date() }, refreshHash: digest(next), revoked: false, expiresAt: { $gt: new Date() } });
      if (prior) {
        const account = prior.account;
        if (account && account.sessionVersion === prior.row.version) return { account, ...(await access(account, sid)), refreshToken: `${sid}.${next}` };
      }
      await sessions.updateOne({ _id: sid, previousHash }, { $set: { revoked: true } });
      throw new DomainError("UNAUTHENTICATED", "Sign in again.");
    };
    const current = await resolveSession({ _id: sid, refreshHash: previousHash, revoked: false, expiresAt: { $gt: new Date() } });
    if (!current) return recoverOrReject();
    // Resolve the account before consuming the rotating credential. A failed
    // database read must leave the existing refresh cookie usable for retry.
    const account = current.account;
    if (!account || account.sessionVersion !== current.row.version) { await sessions.updateOne({ _id: sid, refreshHash: previousHash }, { $set: { revoked: true } }); throw new DomainError("UNAUTHENTICATED", "Sign in again."); }
    const now = new Date();
    const session = await sessions.findOneAndUpdate({ _id: sid, userId: current.row.userId, version: current.row.version, refreshHash: previousHash, revoked: false, expiresAt: { $gt: now } }, { $set: { refreshHash: digest(next), previousHash, updatedAt: now, ...(requestId ? { refreshRetryHash: digest(requestId), refreshRetryUntil: new Date(now.getTime() + 60000) } : {}) }, ...(!requestId ? { $unset: { refreshRetryHash: "", refreshRetryUntil: "" } } : {}) }, { returnDocument: "after" });
    if (!session) return recoverOrReject();
    return { account, ...(await access(account, sid)), refreshToken: `${sid}.${next}` };
  }
  async function revoke(sessionId: string) { verifiedTokenCache.clear(); await sessions.updateOne({ _id: sessionId }, { $set: { revoked: true } }); }
  async function revokeRefresh(value: string) {
    verifiedTokenCache.clear();
    const [sid, secret, ...extra] = value.split(".");
    if (sid && secret && !extra.length) { const secretHash = digest(secret); await sessions.updateOne({ _id: sid, $or: [{ refreshHash: secretHash }, { previousHash: secretHash }] }, { $set: { revoked: true } }); }
  }
  return { initialize, login, createSessionForAccount, verify, refresh, revoke, revokeRefresh, generateMagicLinkToken, verifyMagicLinkToken };
}
