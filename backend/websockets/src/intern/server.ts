import { GridFSBucket, MongoError, ObjectId } from "mongodb";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { DomainError, type Principal, type createInternshipDomain } from "./domain";
import { createInternshipAuth } from "./auth";
import { createInternshipMailer } from "./mailer";
import { can, isAdmin } from "./policy";
import type { ServerWebSocket } from "bun";

type Domain = ReturnType<typeof createInternshipDomain>;
type SocketData = { token: string | null; principal: Principal | null };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const safeContext = (value: string | null) => value && /^[a-zA-Z0-9_-]{16,64}$/.test(value) ? value : null;
const cookieName = (context: string) => `intern_refresh_${context}`;
const cookies = (request: Request) => Object.fromEntries((request.headers.get("cookie") || "").split(";").flatMap(part => { const at = part.indexOf("="); return at < 0 ? [] : [[part.slice(0, at).trim(), decodeURIComponent(part.slice(at + 1).trim())]]; }));
const errorResult = (error: unknown) => error instanceof DomainError ? { code: error.code, message: error.message } : error instanceof MongoError ? { code: "SERVICE_UNAVAILABLE", message: "The internship database is temporarily unavailable. Please retry." } : { code: "INTERNAL", message: "The internship service is temporarily unavailable. Please retry." };
const statusFor = (error: unknown) => error instanceof DomainError ? ({ UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, CLOSED: 409, INVALID_REQUEST: 400, INVALID_CLAIM: 400, ALREADY_APPLIED: 409 } as Record<string, number>)[error.code] || 400 : error instanceof MongoError ? 503 : 500;

export async function createInternshipServer({ domain, secret, port = 3003, hostname = "127.0.0.1", allowedOrigins = [], mailer = createInternshipMailer(), siteOrigin = process.env.INTERN_SITE_ORIGIN || "http://localhost:3000" }: { domain: Domain; secret: string; port?: number; hostname?: string; allowedOrigins?: string[]; mailer?: ReturnType<typeof createInternshipMailer>; siteOrigin?: string }) {
  const auth = createInternshipAuth(domain, secret);
  domain.setHooks({
    async sendApplicationConfirmation(to, name, programName, applicationId) {
      try {
        const token = await auth.generateMagicLinkToken(to, applicationId);
        const magicLinkUrl = `${siteOrigin}/intern/verify?token=${token}`;
        await mailer.sendApplicationConfirmation({ to, name, programName, magicLinkUrl });
      } catch (err) {
        console.warn("[server:hooks] Failed to send application confirmation:", err);
      }
    },
    async sendMagicLink(to, name, applicationId) {
      try {
        const token = await auth.generateMagicLinkToken(to, applicationId);
        const magicLinkUrl = `${siteOrigin}/intern/verify?token=${token}`;
        await mailer.sendMagicLink({ to, name, magicLinkUrl });
      } catch (err) {
        console.warn("[server:hooks] Failed to send magic link:", err);
      }
    },
  });
  await domain.initialize(); await auth.initialize();
  const bucket = new GridFSBucket(domain.db, { bucketName: domain.prefix + "uploads" });
  const files = domain.collection("files");
  const origins = new Set(allowedOrigins.map(value => value.toLowerCase()));
  const allowed = (origin: string | null) => !origin || origins.has(origin.toLowerCase());
  let server: ReturnType<typeof Bun.serve<SocketData>> | undefined;
  const staffSockets = new Map<string, Set<ServerWebSocket<SocketData>>>();
  const forgetStaffSocket = (socket: ServerWebSocket<SocketData>) => {
    const old = socket.data.principal;
    if (old?.role === "company") { const group = staffSockets.get(old.id); group?.delete(socket); if (!group?.size) staffSockets.delete(old.id); }
  };
  // The change stream observes only committed transaction events and shares
  // invalidations across every internship server connected to this database.
  const openChanges = () => domain.collection("events").watch([{ $match: { operationType: "insert" } }], { maxAwaitTimeMS: 1000 });
  let changes = openChanges(), stopped = false;
  const firstChange = await changes.tryNext();
  const publishChange = (change: NonNullable<typeof firstChange>) => {
    if (change.operationType !== "insert") return;
    const record = change.fullDocument;
    if (["application.created", "application.updated", "onboarding.save", "onboarding.submit", "onboarding.approve", "offer.decline", "profile.update"].includes(record.type)) domain.invalidateAnalytics();
    if (record.public === true || record.type === "program.configure") (domain as any).invalidatePublicData?.();
    const ids = new Set<string>([...(Array.isArray(record.applicationIds) ? record.applicationIds : []), record.applicationId].filter((value): value is string => typeof value === "string" && !!value));
    const event = JSON.stringify({ type: "event", event: "intern.changed" });
    server?.publish("intern:company", event, false);
    if (record.type === "staff.changed") {
      for (const accountId of Array.isArray(record.staffAccountIds) ? record.staffAccountIds : []) {
        for (const socket of staffSockets.get(accountId) || []) { socket.send(JSON.stringify({ type: "event", event: "intern.session_changed" })); socket.close(4003, "Staff access changed"); }
      }
    } else if (record.type === "changed") {
      const applicationIds = [...ids];
      if (applicationIds.length) void (async () => {
        try {
          const rows = await domain.collection("applications").find({ _id: { $in: applicationIds } }, { projection: { status: 1 } }).toArray();
          if (rows.some(row => row.status === "Joined")) server?.publish("intern:updates:intern-messages", event, false);
          if (rows.some(row => row.status !== "Joined")) server?.publish("intern:updates:applicant-messages", event, false);
        } catch {
          // Without a current scope we cannot safely choose a topic. Force a
          // reconnect so affected staff reload authorized data once available.
          for (const group of staffSockets.values()) for (const socket of group) {
            const principal = socket.data.principal;
            if (!isAdmin(principal) && (can(principal, "messages.applicants") || can(principal, "messages.interns"))) socket.close(1011, "Live updates temporarily unavailable");
          }
        }
      })();
    } else if (/^(project|task|submission|intern|certificate)\./.test(String(record.type))) {
      server?.publish("intern:updates:work", event, false);
    } else {
      server?.publish("intern:updates:applications", event, false);
    }
    for (const applicationId of ids) server?.publish(`intern:application:${applicationId}`, event, false);
    if (record.public === true) server?.publish("intern:public", event, false);
  };
  if (firstChange) publishChange(firstChange);
  void (async () => {
    let delay = 1000;
    while (!stopped) {
      try {
        for await (const change of changes) publishChange(change);
        if (stopped) break;
      } catch (error) {
        if (stopped) break;
        console.error("[internship] Reconnecting database change stream:", error instanceof Error ? error.message : "Unknown error");
      }
      while (!stopped) {
        await new Promise<void>(resolve => { const timer = setTimeout(resolve, delay); timer.unref?.(); });
        if (stopped) break;
        try {
          changes = openChanges();
          const first = await changes.tryNext();
          if (first) publishChange(first);
          domain.invalidateAnalytics();
          (domain as any).invalidatePublicData?.();
          // Any events missed while disconnected are recovered by reloading
          // each client's authorized snapshot, without broadcasting records.
          server?.publish("intern:public", JSON.stringify({ type: "event", event: "intern.changed" }), false);
          delay = 1000;
          break;
        } catch { await changes.close().catch(() => {}); delay = Math.min(delay * 2, 10000); }
      }
    }
  })();
  const withCors = (origin: string | null, extra: Record<string, string> = {}) => {
    const headers = new Headers(extra);
    if (origin && allowed(origin)) { headers.set("Access-Control-Allow-Origin", origin); headers.set("Access-Control-Allow-Credentials", "true"); headers.set("Vary", "Origin"); }
    headers.set("Cache-Control", "no-store"); return headers;
  };
  const sendJson = (body: unknown, origin: string | null, status = 200, extra: Record<string, string> = {}) => Response.json(body, { status, headers: withCors(origin, extra) });
  const cookie = (request: Request, context: string, value: string, maxAge: number) => `${cookieName(context)}=${encodeURIComponent(value)}; Path=/intern/auth; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https" ? "; Secure" : ""}`;
  const bearer = (request: Request) => (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const authenticate = async (request: Request) => { const value = bearer(request); return value ? (await auth.verify(value)).account : null; };
  async function refresh(request: Request, origin: string | null) {
    const context = safeContext(request.headers.get("x-intern-context"));
    if (!context) throw new DomainError("INVALID_REQUEST", "A browser session is required.");
    const value = cookies(request)[cookieName(context)];
    if (!value) throw new DomainError("UNAUTHENTICATED", "Sign in to continue.");
    const result = await auth.refresh(value, request.headers.get("x-intern-refresh-request"));
    return sendJson({ ok: true, data: { account: result.account, token: result.token, expiresAt: result.expiresAt } }, origin, 200, { "Set-Cookie": cookie(request, context, result.refreshToken, 604800) });
  }
  server = Bun.serve<SocketData>({
    port, hostname, idleTimeout: 30,
    async fetch(request, instance) {
      const url = new URL(request.url), origin = request.headers.get("origin");
      if (!allowed(origin)) return sendJson({ ok: false, error: { code: "FORBIDDEN", message: "Origin not allowed." } }, null, 403);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: withCors(origin, { "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Intern-Context, X-Intern-Refresh-Request, X-File-Name, X-File-Kind, X-File-Token" }) });
      try {
        if (url.pathname === "/intern/health") return sendJson({ ok: true }, origin);
        if (url.pathname === "/ws/intern") {
          if (instance.upgrade(request, { data: { token: null, principal: null } })) return;
          return sendJson({ ok: false, error: { code: "BAD_UPGRADE", message: "WebSocket upgrade failed." } }, origin, 400);
        }
        if (url.pathname === "/intern/auth/login" && request.method === "POST") {
          const context = safeContext(request.headers.get("x-intern-context"));
          if (!context) throw new DomainError("INVALID_REQUEST", "A browser session is required.");
          const input = await request.json() as { email?: string; password?: string };
          const result = await auth.login(String(input.email || ""), String(input.password || ""));
          return sendJson({ ok: true, data: { account: result.account, token: result.token, expiresAt: result.expiresAt } }, origin, 200, { "Set-Cookie": cookie(request, context, result.refreshToken, 604800) });
        }
        if (url.pathname === "/intern/auth/magic-link" && request.method === "POST") {
          const input = await request.json() as { email?: string };
          const email = String(input.email || "").trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new DomainError("INVALID_REQUEST", "Please enter a valid email address.");
          }
          const app = await domain.findApplicationByEmail(email);
          if (app) {
            const token = await auth.generateMagicLinkToken(app.email, app._id);
            const magicLinkUrl = `${siteOrigin}/intern/verify?token=${token}`;
            await mailer.sendMagicLink({ to: app.email, name: app.name, magicLinkUrl });
          }
          return sendJson({ ok: true, data: { message: "If an application exists for this email, a sign-in link has been sent to your inbox." } }, origin, 200);
        }
        if (url.pathname === "/intern/auth/verify-magic-link" && request.method === "POST") {
          const context = safeContext(request.headers.get("x-intern-context"));
          if (!context) throw new DomainError("INVALID_REQUEST", "A browser session is required.");
          const input = await request.json() as { token?: string };
          const rawToken = String(input.token || "").trim();
          if (!rawToken) throw new DomainError("INVALID_REQUEST", "A sign-in token is required.");
          const { email, applicationId } = await auth.verifyMagicLinkToken(rawToken);
          const account = await domain.autoProvisionAccount(applicationId, email);
          const result = await auth.createSessionForAccount(account);
          return sendJson({ ok: true, data: { account: result.account, token: result.token, expiresAt: result.expiresAt } }, origin, 200, { "Set-Cookie": cookie(request, context, result.refreshToken, 604800) });
        }
        if (url.pathname === "/intern/auth/request-password-reset" && request.method === "POST") {
          const input = await request.json() as { email?: string };
          const email = String(input.email || "").trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new DomainError("INVALID_REQUEST", "Please enter a valid email address.");
          }
          let user = await domain.findUserByEmail(email);
          if (!user) {
            const app = await domain.findApplicationByEmail(email);
            if (app) {
              const provisioned = await domain.autoProvisionAccount(app._id, app.email);
              user = { _id: provisioned.id, name: provisioned.name, email: provisioned.email } as any;
            }
          }
          if (user) {
            const token = await auth.generatePasswordResetToken(user.email, user._id);
            const resetUrl = `${siteOrigin}/intern/reset-password?token=${token}`;
            await mailer.sendPasswordResetLink({ to: user.email, name: user.name, resetUrl });
          }
          return sendJson({ ok: true, data: { message: "If an account exists with this email, password reset instructions have been sent to your inbox." } }, origin, 200);
        }
        if (url.pathname === "/intern/auth/reset-password" && request.method === "POST") {
          const input = await request.json() as { token?: string; password?: string };
          const rawToken = String(input.token || "").trim();
          const password = String(input.password || "");
          if (!rawToken) throw new DomainError("INVALID_REQUEST", "A reset token is required.");
          if (password.length < 8 || password.length > 256) throw new DomainError("INVALID_REQUEST", "Password must be at least 8 characters.");
          const { email, userId } = await auth.verifyPasswordResetToken(rawToken);
          await domain.selfResetPassword(userId, password);
          return sendJson({ ok: true, data: { message: "Your password has been successfully reset. Sign in to continue." } }, origin, 200);
        }
        if (url.pathname === "/intern/auth/refresh" && request.method === "POST") return await refresh(request, origin);
        if (url.pathname === "/intern/auth/logout" && request.method === "POST") {
          const context = safeContext(request.headers.get("x-intern-context"));
          if (!context) throw new DomainError("INVALID_REQUEST", "A browser session is required.");
          const value = cookies(request)[cookieName(context)];
          if (value) await auth.revokeRefresh(value);
          const token = bearer(request);
          if (token) { try { await auth.revoke((await auth.verify(token)).sessionId); } catch { /* Expired access tokens can still log out through their refresh cookie. */ } }
          return sendJson({ ok: true }, origin, 200, { "Set-Cookie": cookie(request, context, "", 0) });
        }
        if (url.pathname === "/intern/files" && request.method === "POST") {
          const kind = request.headers.get("x-file-kind") || "resume", name = (request.headers.get("x-file-name") || "").split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g, "").trim() || "";
          if (!name || name.length > 200 || !["resume", "work"].includes(kind) || (kind === "resume" && !/\.(pdf|doc|docx)$/i.test(name))) throw new DomainError("INVALID_REQUEST", "Choose a valid file.");
          const account = await authenticate(request); if (kind === "work" && !account) throw new DomainError("UNAUTHENTICATED", "Sign in to upload work.");
          if (account?.role === "company") throw new DomainError("FORBIDDEN", "Staff accounts cannot upload intern attachments.");
          const maximum = (kind === "resume" ? 5 : 10) * 1024 * 1024, declared = Number(request.headers.get("content-length") || 0);
          if (declared > maximum || !request.body) throw new DomainError("INVALID_REQUEST", "The file is too large or empty.");
          const gridId = new ObjectId(), attachmentId = randomUUID(), accessToken = randomBytes(32).toString("base64url"), upload = bucket.openUploadStreamWithId(gridId, name);
          let size = 0;
          const limit = new Transform({ transform(chunk, _encoding, callback) { size += chunk.length; callback(size > maximum ? new Error("LIMIT") : null, chunk); } });
          try { await pipeline(Readable.fromWeb(request.body as any), limit, upload); if (!size) throw new Error("EMPTY"); }
          catch { try { await bucket.delete(gridId); } catch {} throw new DomainError("INVALID_REQUEST", "The file is too large, empty, or could not be uploaded."); }
          try { await files.insertOne({ _id: attachmentId, gridId, kind, name, type: request.headers.get("content-type") || "application/octet-stream", size, status: "ready", accessTokenHash: hash(accessToken), ...(account?.applicationId ? { ownerApplicationId: account.applicationId } : {}), createdAt: new Date() }); }
          catch (error) { try { await bucket.delete(gridId); } catch {} throw error; }
          return sendJson({ ok: true, data: { id: attachmentId, name, type: request.headers.get("content-type") || "application/octet-stream", size, accessToken } }, origin);
        }
        if (url.pathname.startsWith("/intern/files/") && request.method === "GET") {
          const file = await files.findOne({ _id: decodeURIComponent(url.pathname.slice("/intern/files/".length)), status: "ready" });
          if (!file) throw new DomainError("NOT_FOUND", "File not found.");
          const account = await authenticate(request), accessToken = request.headers.get("x-file-token") || "";
          const staffAccess = account?.role === "company" && (file.kind === "resume" ? can(account, "resumes.read") : can(account, "submissions.read"));
          const ownerAccess = account?.role === "intern" && account.applicationId && account.applicationId === (file.applicationId || file.ownerApplicationId);
          const pendingUploadAccess = !account && !file.applicationId && !file.ownerApplicationId && accessToken && file.accessTokenHash === hash(accessToken);
          if (!(staffAccess || ownerAccess || pendingUploadAccess)) throw new DomainError("FORBIDDEN", "File access denied.");
          const stream = Readable.toWeb(bucket.openDownloadStream(file.gridId)) as ReadableStream;
          return new Response(stream, { headers: withCors(origin, { "Content-Type": file.type, "Content-Disposition": `attachment; filename="${file.name.replace(/["\\]/g, "_")}"`, "Content-Length": String(file.size), "Access-Control-Expose-Headers": "Content-Disposition" }) });
        }
        throw new DomainError("NOT_FOUND", "Endpoint not found.");
      } catch (error) { return sendJson({ ok: false, error: errorResult(error) }, origin, statusFor(error)); }
    },
    websocket: {
      idleTimeout: 30, sendPings: true, maxPayloadLength: 65536, backpressureLimit: 262144, closeOnBackpressureLimit: true,
      open(socket) { socket.subscribe("intern:public"); socket.send(JSON.stringify({ type: "ready", version: 1 })); },
      async message(socket, frame) {
        let request: { id?: string; type?: string; method?: string; params?: Record<string, any>; idempotencyKey?: string };
        try { request = JSON.parse(typeof frame === "string" ? frame : new TextDecoder().decode(frame)); } catch { return; }
        if (request.type !== "request" || typeof request.id !== "string" || typeof request.method !== "string") return;
        try {
          let result: unknown;
          if (request.method === "auth.authenticate") {
            forgetStaffSocket(socket);
            for (const topic of ["intern:company", "intern:updates:applications", "intern:updates:work", "intern:updates:applicant-messages", "intern:updates:intern-messages"]) socket.unsubscribe(topic);
            if (socket.data.principal?.applicationId) socket.unsubscribe(`intern:application:${socket.data.principal.applicationId}`);
            // Do not retain a previous authenticated identity if replacement
            // authentication fails partway through.
            socket.data.token = null; socket.data.principal = null;
            const token = typeof request.params?.token === "string" ? request.params.token : null;
            const principal = token ? (await auth.verify(token)).account : null;
            socket.data.token = token; socket.data.principal = principal;
            if (principal?.role === "company") {
              let group = staffSockets.get(principal.id); if (!group) staffSockets.set(principal.id, group = new Set()); group.add(socket);
              if (isAdmin(principal)) socket.subscribe("intern:company");
              else {
                if (["overview.read", "applications.read", "interns.read"].some(permission => can(principal, permission))) socket.subscribe("intern:updates:applications");
                if (["overview.read", "projects.summary", "projects.read", "tasks.read", "submissions.read", "interns.read", "certificates.read"].some(permission => can(principal, permission))) socket.subscribe("intern:updates:work");
                if (can(principal, "messages.applicants")) socket.subscribe("intern:updates:applicant-messages");
                if (can(principal, "messages.interns")) socket.subscribe("intern:updates:intern-messages");
              }
            }
            else if (principal?.applicationId) socket.subscribe(`intern:application:${principal.applicationId}`);
            result = principal;
          } else {
            const principal = socket.data.token ? (await auth.verify(socket.data.token)).account : null;
            result = await domain.execute(request.method, request.params || {}, principal, request.idempotencyKey);
            if (principal?.role === "company" && socket.data.token) await auth.verify(socket.data.token);
          }
          socket.send(JSON.stringify({ type: "response", id: request.id, ok: true, data: result }));
        } catch (error) { socket.send(JSON.stringify({ type: "response", id: request.id, ok: false, error: errorResult(error) })); }
      },
      close(socket) { forgetStaffSocket(socket); },
    },
  });
  return { server, auth, stop: async () => { stopped = true; await changes.close(); await server?.stop(true); } };
}
