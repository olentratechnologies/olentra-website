import type { Server, ServerWebSocket } from "bun";
import { DomainError } from "../shared/errors";
import type { createInternshipDomain } from "./command-dispatcher";
import { internshipEnv } from "../config/env";
import { createInternshipMailer } from "../infrastructure/email/mailer";
import { can, isAdmin } from "../modules/access/policy";
import { logger } from "../infrastructure/observability/logger";
import { createGridFsStore } from "../infrastructure/files/gridfs.store";
import { createInternshipContainer } from "./container";
import { createCorsHeaders, errorResult, sendJson as sendJsonResponse, statusFor } from "../interfaces/http/router";
import { CORS_HEADERS, CORS_METHODS, createOriginGuard, requestId } from "../interfaces/http/middleware";
import { createAuthRoutes, AUTH_PATHS } from "../interfaces/http/auth.routes";
import { clientAddress, mongoAttemptStore } from "../modules/auth/login-throttle";
import { runLeasedJob } from "../modules/outbox/outbox";
import { removeOrphanedUploads } from "../modules/files/cleanup";
import { createRateLimiter, type RateLimiter } from "../modules/auth/rate-limit";
import { createFilesRoutes, isFileDownloadPath, isFileUploadPath } from "../interfaces/http/files.routes";
import { healthResponse as internshipHealthResponse } from "../interfaces/http/health.routes";
import { healthResponse as presenceHealthResponse } from "../interfaces/http/presence-health.route";
import { statsResponse as presenceStatsResponse } from "../interfaces/http/presence-stats.route";
import { createPresenceWebSocketHandlers } from "../interfaces/websocket/presence-connection.adapter";
import { parseConnectionQuery } from "../interfaces/websocket/presence-protocol";
import { PRESENCE_TOPIC, type PresenceSocketData } from "../interfaces/websocket/presence-topics";
import { clearSubscriptions, subscribeForPrincipal } from "../interfaces/websocket/router";
import { StaffSocketRegistry } from "../interfaces/websocket/session";
import { parseInternRpcFrame, readyMessage, rpcErrorResponse, rpcResponse, type InternSocketData } from "../interfaces/websocket/protocol";
import { INTERN_TOPICS } from "../interfaces/websocket/topics";
import { createPresenceTracker } from "../modules/presence/presence-tracker";
import { affectsInsights, createPublicInsights, throttle } from "../modules/insights/insights.service";

type Domain = ReturnType<typeof createInternshipDomain>;
type RealtimeSocketData = PresenceSocketData | InternSocketData;

type InternshipRuntime = {
  auth: ReturnType<typeof createInternshipContainer>["auth"];
  domain: Domain;
  authRoutes: ReturnType<typeof createAuthRoutes>;
  fileRoutes: ReturnType<typeof createFilesRoutes>;
  limiter: RateLimiter;
  staffSockets: StaffSocketRegistry;
  insights: ReturnType<typeof createPublicInsights>;
  insightsViewers: () => number;
  broadcastInsights: () => void;
  broadcastViewers: () => void;
  close: () => Promise<void>;
};

type RealtimeServerOptions = {
  port?: number;
  hostname?: string;
  allowedOrigins?: string[];
  presenceBroadcastIntervalMs?: number;
  presenceLog?: boolean;
};

type InternshipAttachOptions = {
  domain: Domain;
  secret: string;
  mailer?: ReturnType<typeof createInternshipMailer>;
  siteOrigin?: string;
};

const unavailable = (origin: string | null, sendJson: (body: unknown, origin: string | null, status?: number) => Response) =>
  sendJson({ ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "The internship service is temporarily unavailable. Please retry." } }, origin, 503);

/** At most 20 certificate checks per connection per minute. */
const VERIFY_LIMIT = 20, VERIFY_WINDOW_MS = 60_000;
export function allowVerify(socket: { data: { verifyWindow?: { start: number; count: number } } }, now = Date.now()) {
  const window = socket.data.verifyWindow;
  if (!window || now - window.start >= VERIFY_WINDOW_MS) { socket.data.verifyWindow = { start: now, count: 1 }; return true; }
  window.count++;
  return window.count <= VERIFY_LIMIT;
}

/** Unified Bun composition root for presence and internship real-time modules. */
export function createRealtimeServer(options: RealtimeServerOptions = {}) {
  const allowedOrigins = options.allowedOrigins ?? [];
  const internshipAllowed = createOriginGuard(allowedOrigins);
  const presenceAllowed = (origin: string | null) => !origin || allowedOrigins.length === 0 || allowedOrigins.includes("*") || allowedOrigins.some(value => value.toLowerCase() === origin.toLowerCase());
  const presenceCors = (origin: string | null) => !origin
    ? { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" }
    : { "Access-Control-Allow-Origin": presenceAllowed(origin) ? origin : "*", "Cache-Control": "no-store" };
  const presence = createPresenceTracker({
    broadcastIntervalMs: options.presenceBroadcastIntervalMs,
    broadcast: payload => publishPresence(payload),
  });
  let server: Server<RealtimeSocketData>;
  let runtime: InternshipRuntime | null = null;
  let stopped = false;

  function publishPresence(payload: string) {
    return server ? server.publish(PRESENCE_TOPIC, payload, false) : 0;
  }

  const presenceHandlers = createPresenceWebSocketHandlers({
    presence,
    publish: payload => { publishPresence(payload); },
    log: options.presenceLog === true,
  });

  const withCors = (origin: string | null, extra: Record<string, string> = {}) => createCorsHeaders(origin, internshipAllowed, extra);
  const sendJson = (body: unknown, origin: string | null, status = 200, extra: Record<string, string> = {}) => sendJsonResponse(body, origin, internshipAllowed, status, extra);

  function presenceFetch(request: Request, instance: Server<RealtimeSocketData> | Server<PresenceSocketData>) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const cors = presenceCors(origin);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...cors, "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
    if (url.pathname === "/health") return presenceHealthResponse(presence, cors);
    if (url.pathname === "/stats") return presenceStatsResponse(presence, cors);
    if (url.pathname !== "/ws" && url.pathname !== "/") return new Response("Not Found", { status: 404 });
    if (!presenceAllowed(origin)) return new Response("Origin not allowed", { status: 403 });
    const query = parseConnectionQuery(url);
    if ("error" in query) return new Response(query.error, { status: 400 });
    const socketServer = instance as unknown as Server<RealtimeSocketData>;
    if (socketServer.upgrade(request, { data: { kind: "presence", connectionId: crypto.randomUUID(), ...query } })) return;
    return new Response("WebSocket upgrade failed", { status: 400 });
  }

  async function attachInternship({ domain, secret, mailer = createInternshipMailer(), siteOrigin = internshipEnv("INTERNSHIP_SITE_ORIGIN", "INTERN_SITE_ORIGIN") || "http://localhost:3000" }: InternshipAttachOptions) {
    if (stopped) throw new Error("Realtime server is stopped.");
    if (runtime) await runtime.close();
    const container = createInternshipContainer({ domain, secret, mailer, siteOrigin });
    const auth = container.auth;
    domain.setHooks({
      // These two are sent by the email outbox, which retries when they throw.
      async sendApplicationConfirmation(to, name, programName, applicationId) {
        const token = await auth.generateMagicLinkToken(to, applicationId);
        const result = await mailer.sendApplicationConfirmation({ to, name, programName, magicLinkUrl: `${siteOrigin}/intern/verify?token=${token}` });
        if (!result.ok) throw new Error(result.error || "Application confirmation was not delivered.");
      },
      async sendMagicLink(to, name, applicationId) {
        const token = await auth.generateMagicLinkToken(to, applicationId);
        const result = await mailer.sendMagicLink({ to, name, magicLinkUrl: `${siteOrigin}/intern/verify?token=${token}` });
        if (!result.ok) throw new Error(result.error || "Sign-in link was not delivered.");
      },
      async sendApplicantStatus(notice) {
        {
          const certificateVerifyUrl = notice.certificateNumber
            ? `${siteOrigin}/certificates/verify/${encodeURIComponent(notice.certificateNumber)}`
            : undefined;
          const linkedinShareUrl = certificateVerifyUrl
            ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certificateVerifyUrl)}`
            : undefined;
          const result = await mailer.sendApplicantStatus({
            ...notice,
            portalUrl: `${siteOrigin}/intern/portal`,
            certificateVerifyUrl,
            linkedinShareUrl,
          });
          // Throwing lets the email outbox retry; direct callers already catch and log.
          if (!result.ok) throw new Error(result.error || "Applicant status email was not delivered.");
        }
      },
      async sendInterviewScheduled(notice) {
        try {
          const result = await mailer.sendInterviewScheduled({
            ...notice,
            portalUrl: `${siteOrigin}/intern/portal`,
          });
          if (!result.ok) logger.warn("Interview email was not delivered", { to: notice.to, error: result.error });
        } catch (error) { logger.warn("Failed to send interview email", { error }); }
      },
      async sendInterviewCancelled(notice) {
        try {
          const result = await mailer.sendInterviewCancelled({
            ...notice,
            portalUrl: `${siteOrigin}/intern/portal`,
          });
          if (!result.ok) logger.warn("Interview cancellation email was not delivered", { to: notice.to, error: result.error });
        } catch (error) { logger.warn("Failed to send interview cancellation email", { error }); }
      },
    });
    await domain.initialize();
    await auth.initialize();
    const bucket = createGridFsStore(domain.db, domain.prefix + "uploads").bucket;
    const files = domain.collection("files");
    const staffSockets = new StaffSocketRegistry();
    const openChanges = () => domain.collection("events").watch([{ $match: { operationType: "insert" } }], { maxAwaitTimeMS: 1000 });
    let changes = openChanges();
    let localStopped = false;
    const insights = createPublicInsights({ collection: domain.collection });
    const insightsViewers = () => server ? server.subscriberCount(INTERN_TOPICS.insights) : 0;
    // One aggregation per burst serves every open careers page; viewers never re-query.
    const broadcastInsights = throttle(() => {
      if (localStopped || !insightsViewers()) return;
      void insights.get()
        .then(data => { if (!localStopped) server?.publish(INTERN_TOPICS.insights, JSON.stringify({ type: "event", event: "intern.insights", data: { ...data, viewers: insightsViewers() } }), false); })
        .catch(error => logger.warn("Failed to publish internship insights", { error }));
    }, 2000);
    const broadcastViewers = throttle(() => {
      if (!localStopped) server?.publish(INTERN_TOPICS.insights, JSON.stringify({ type: "event", event: "intern.insights.viewers", viewers: insightsViewers() }), false);
    }, 1000);

    // Named "new application" alerts go only to staff who may read applications.
    const announceApplication = async (applicationId: string | undefined) => {
      if (!applicationId) return;
      try {
        const row = await domain.collection("applications").findOne({ _id: applicationId }, { projection: { name: 1, programId: 1, hasVideo: 1 } });
        if (!row) return;
        const frame = JSON.stringify({ type: "event", event: "intern.application_created", applicationId, name: String(row.name || ""), programId: String(row.programId || ""), hasVideo: row.hasVideo === true });
        for (const group of staffSockets.all()) for (const socket of group) {
          const principal = socket.data.principal;
          if (principal && (isAdmin(principal) || can(principal, "applications.read"))) socket.send(frame);
        }
      } catch (error) { logger.warn("Failed to announce new application", { error }); }
    };

    const publishChange = (change: any) => {
      if (change?.operationType !== "insert") return;
      const record = change.fullDocument;
      if (["application.created", "application.updated", "onboarding.save", "onboarding.submit", "onboarding.approve", "offer.decline", "profile.update"].includes(record.type)) domain.invalidateAnalytics();
      if (record.public === true || record.type === "program.configure") (domain as any).invalidatePublicData?.();
      // Public events include program/track toggles, which change which tracks insights cover.
      if (affectsInsights(record.type) || record.public === true) { insights.invalidate(); broadcastInsights(); }
      const ids = new Set<string>([...(Array.isArray(record.applicationIds) ? record.applicationIds : []), record.applicationId].filter((value): value is string => typeof value === "string" && !!value));
      const event = JSON.stringify({ type: "event", event: "intern.changed" });
      server?.publish(INTERN_TOPICS.company, event, false);
      if (record.type === "application.created") void announceApplication([...ids][0]);
      // Only the person assigned hears about it, and never about their own assignment.
      if (record.type === "application.assigned" && typeof record.assigneeId === "string" && record.assigneeId !== record.assignedBy) {
        const frame = JSON.stringify({ type: "event", event: "intern.assigned", count: ids.size, applicationId: ids.size === 1 ? [...ids][0] : null });
        for (const socket of staffSockets.forAccount(record.assigneeId)) socket.send(frame);
      }
      if (record.type === "staff.changed") {
        for (const accountId of Array.isArray(record.staffAccountIds) ? record.staffAccountIds : []) {
          for (const socket of staffSockets.forAccount(accountId)) {
            socket.send(JSON.stringify({ type: "event", event: "intern.session_changed" }));
            socket.close(4003, "Staff access changed");
          }
        }
      } else if (record.type === "changed") {
        const applicationIds = [...ids];
        if (applicationIds.length) void (async () => {
          try {
            const rows = await domain.collection("applications").find({ _id: { $in: applicationIds } }, { projection: { status: 1 } }).toArray();
            if (rows.some(row => row.status === "Joined")) server?.publish(INTERN_TOPICS.internMessages, event, false);
            if (rows.some(row => row.status !== "Joined")) server?.publish(INTERN_TOPICS.applicantMessages, event, false);
          } catch {
            for (const group of staffSockets.all()) for (const socket of group) {
              const principal = socket.data.principal;
              if (!isAdmin(principal) && (can(principal, "messages.applicants") || can(principal, "messages.interns"))) socket.close(1011, "Live updates temporarily unavailable");
            }
          }
        })();
      } else if (/^(project|task|submission|intern|certificate)\./.test(String(record.type))) {
        server?.publish(INTERN_TOPICS.work, event, false);
      } else {
        server?.publish(INTERN_TOPICS.applications, event, false);
      }
      for (const applicationId of ids) server?.publish(`intern:application:${applicationId}`, event, false);
      if (record.public === true) server?.publish(INTERN_TOPICS.public, event, false);
    };

    const firstChange = await changes.tryNext();
    if (firstChange) publishChange(firstChange);
    void (async () => {
      let delay = 1000;
      while (!localStopped && !stopped) {
        try {
          for await (const change of changes) publishChange(change);
          if (localStopped || stopped) break;
        } catch (error) {
          if (localStopped || stopped) break;
          logger.error("Reconnecting database change stream", { error });
        }
        while (!localStopped && !stopped) {
          await new Promise<void>(resolve => { const timer = setTimeout(resolve, delay); timer.unref?.(); });
          if (localStopped || stopped) break;
          try {
            changes = openChanges();
            const first = await changes.tryNext();
            if (first) publishChange(first);
            domain.invalidateAnalytics();
            (domain as any).invalidatePublicData?.();
            insights.invalidate(); broadcastInsights();
            server?.publish(INTERN_TOPICS.public, JSON.stringify({ type: "event", event: "intern.changed" }), false);
            delay = 1000;
            break;
          } catch { await changes.close().catch(() => {}); delay = Math.min(delay * 2, 10000); }
        }
      }
    })();

    const workspaceOrigin = (process.env.INTERNSHIP_WORKSPACE_ORIGIN || "http://localhost:3002").replace(/\/$/, "");
    const jobLeases = domain.collection("job_leases") as any;
    const stopUploadCleanup = runLeasedJob(jobLeases, "orphaned-upload-cleanup", 60 * 60_000, () => removeOrphanedUploads(files as any, bucket), error => logger.error("Orphaned upload cleanup failed", { error }));
    const stopRetention = runLeasedJob(jobLeases, "applicant-retention", 6 * 60 * 60_000, () => domain.runRetention(), error => logger.error("Applicant retention run failed", { error }));
    const stopOutbox = runLeasedJob(jobLeases, "email-outbox", 2000, () => domain.processOutbox(), error => logger.error("Email outbox run failed", { error }));
    const limiter = createRateLimiter(mongoAttemptStore(domain.collection("rate_limits")));
    await domain.collection("rate_limits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    const authRoutes = createAuthRoutes({ auth, domain, mailer, siteOrigin, workspaceOrigin, sendJson, limiter });
    const fileRoutes = createFilesRoutes({ auth, bucket, files, withCors, sendJson, limiter });
    const nextRuntime: InternshipRuntime = {
      auth,
      domain,
      authRoutes,
      fileRoutes,
      limiter,
      staffSockets,
      insights,
      insightsViewers,
      broadcastInsights,
      broadcastViewers,
      async close() {
        localStopped = true;
        stopOutbox(); stopUploadCleanup(); stopRetention();
        broadcastInsights.cancel(); broadcastViewers.cancel();
        await changes.close().catch(() => {});
        if (runtime === nextRuntime) runtime = null;
      },
    };
    runtime = nextRuntime;
    logger.info("Internship modules attached to realtime server");
    return nextRuntime;
  }

  server = Bun.serve<RealtimeSocketData>({
    port: options.port ?? 3003,
    hostname: options.hostname ?? "127.0.0.1",
    idleTimeout: 30,
    async fetch(request, instance) {
      const url = new URL(request.url);
      const origin = request.headers.get("origin");
      if (url.pathname === "/health" || url.pathname === "/stats" || url.pathname === "/ws" || url.pathname === "/") return presenceFetch(request, instance);
      if (!internshipAllowed(origin)) return sendJson({ ok: false, error: { code: "FORBIDDEN", message: "Origin not allowed." } }, null, 403);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: withCors(origin, { "Access-Control-Allow-Methods": CORS_METHODS, "Access-Control-Allow-Headers": CORS_HEADERS }) });
      try {
        if (url.pathname === "/intern/health") return runtime ? sendJson(internshipHealthResponse(), origin) : unavailable(origin, sendJson);
        if (url.pathname === "/ws/intern") {
          if (!runtime) return unavailable(origin, sendJson);
          if (instance.upgrade(request, { data: { kind: "intern", token: null, principal: null, address: clientAddress(request, instance.requestIP(request)?.address, /^(true|1)$/i.test(process.env.REALTIME_TRUST_PROXY || "")) } })) return;
          return sendJson({ ok: false, error: { code: "BAD_UPGRADE", message: "WebSocket upgrade failed." } }, origin, 400);
        }
        if (!runtime) return unavailable(origin, sendJson);
        // Await route adapters inside this boundary so rejected asynchronous
        // DomainError/MongoDB operations are converted to the API contract
        // rather than escaping Bun as a raw 500 error page.
        if (url.pathname === AUTH_PATHS.login && request.method === "POST") return await runtime.authRoutes.login(request, origin, instance.requestIP(request)?.address);
        if (url.pathname === AUTH_PATHS.magicLink && request.method === "POST") return await runtime.authRoutes.magicLink(request, origin, instance.requestIP(request)?.address);
        if (url.pathname === AUTH_PATHS.verifyMagicLink && request.method === "POST") return await runtime.authRoutes.verifyMagicLink(request, origin);
        if (url.pathname === AUTH_PATHS.requestPasswordReset && request.method === "POST") return await runtime.authRoutes.requestPasswordReset(request, origin, instance.requestIP(request)?.address);
        if (url.pathname === AUTH_PATHS.resetPassword && request.method === "POST") return await runtime.authRoutes.resetPassword(request, origin);
        if (url.pathname === AUTH_PATHS.refresh && request.method === "POST") return await runtime.authRoutes.refresh(request, origin);
        if (url.pathname === AUTH_PATHS.logout && request.method === "POST") return await runtime.authRoutes.logout(request, origin);
        if (url.pathname === AUTH_PATHS.session && request.method === "GET") return await runtime.authRoutes.session(request, origin);
        if (url.pathname === AUTH_PATHS.changePassword && request.method === "POST") return await runtime.authRoutes.changePassword(request, origin);
        if (isFileUploadPath(url.pathname, request.method)) return await runtime.fileRoutes.upload(request, origin, instance.requestIP(request)?.address);
        if (isFileDownloadPath(url.pathname, request.method)) return await runtime.fileRoutes.download(request, origin);
        throw new DomainError("NOT_FOUND", "Endpoint not found.");
      } catch (error) {
        const status = statusFor(error);
        const fields = { requestId: requestId(request), method: request.method, path: url.pathname, status, error };
        // 4xx answers (signed out, bad input, forbidden) are the API working as
        // designed; only requests the service could not handle are errors.
        if (status >= 500) logger.error("HTTP request failed", fields);
        else logger.info("HTTP request rejected", fields);
        return sendJson({ ok: false, error: errorResult(error) }, origin, status);
      }
    },
    websocket: {
      idleTimeout: 30,
      sendPings: true,
      maxPayloadLength: 65536,
      backpressureLimit: 262144,
      closeOnBackpressureLimit: true,
      open(socket) {
        if (socket.data.kind === "presence") {
          presenceHandlers.open(socket as ServerWebSocket<PresenceSocketData>);
          return;
        }
        if (!runtime) { socket.close(1013, "Internship service unavailable"); return; }
        socket.subscribe(INTERN_TOPICS.public);
        socket.send(JSON.stringify(readyMessage()));
      },
      async message(socket, frame) {
        if (socket.data.kind === "presence") {
          presenceHandlers.message(socket as ServerWebSocket<PresenceSocketData>, frame);
          return;
        }
        if (!runtime) { socket.close(1013, "Internship service unavailable"); return; }
        const request = parseInternRpcFrame(frame);
        if (!request || request.type !== "request" || typeof request.id !== "string" || typeof request.method !== "string") return;
        try {
          let result: unknown;
          if (request.method === "auth.authenticate") {
            runtime.staffSockets.remove(socket as ServerWebSocket<InternSocketData>);
            clearSubscriptions(socket as ServerWebSocket<InternSocketData>);
            socket.data.token = null;
            socket.data.principal = null;
            const token = typeof request.params?.token === "string" ? request.params.token : null;
            const principal = token ? (await runtime.auth.verify(token)).account : null;
            socket.data.token = token;
            socket.data.principal = principal;
            if (principal?.role === "company") runtime.staffSockets.add(principal.id, socket as ServerWebSocket<InternSocketData>);
            subscribeForPrincipal(socket as ServerWebSocket<InternSocketData>, principal);
            result = principal;
          } else if (request.method === "insights.subscribe") {
            socket.subscribe(INTERN_TOPICS.insights);
            (socket.data as InternSocketData).insights = true;
            result = { ...(await runtime.insights.get()), viewers: runtime.insightsViewers() };
            runtime.broadcastViewers();
          } else if (request.method === "insights.unsubscribe") {
            socket.unsubscribe(INTERN_TOPICS.insights);
            (socket.data as InternSocketData).insights = false;
            runtime.broadcastViewers();
            result = null;
          } else if (request.method === "certificate.verify" && !allowVerify(socket as ServerWebSocket<InternSocketData>)) {
            throw new DomainError("RATE_LIMITED", "Too many certificate checks. Please wait a minute and try again.");
          } else if (request.method === "application.submit" && !socket.data.token) {
            // Applying sends email and stores data, so anonymous applies are
            // limited per client address and per email, shared across sockets.
            const email = typeof request.params?.email === "string" ? request.params.email : null;
            await runtime.limiter.consume("apply", (socket.data as InternSocketData).address || "unknown", email);
            result = await runtime.domain.execute(request.method, request.params || {}, null, request.idempotencyKey);
          } else if (request.method === "intern.insights") {
            result = { ...(await runtime.insights.get()), viewers: runtime.insightsViewers() };
          } else {
            const principal = socket.data.token ? (await runtime.auth.verify(socket.data.token)).account : null;
            result = await runtime.domain.execute(request.method, request.params || {}, principal, request.idempotencyKey);
            if (principal?.role === "company" && socket.data.token) await runtime.auth.verify(socket.data.token);
          }
          socket.send(JSON.stringify(rpcResponse(request.id, result)));
        } catch (error) { socket.send(JSON.stringify(rpcErrorResponse(request.id, errorResult(error)))); }
      },
      close(socket) {
        if (socket.data.kind === "presence") presenceHandlers.close(socket as ServerWebSocket<PresenceSocketData>);
        else {
          runtime?.staffSockets.remove(socket as ServerWebSocket<InternSocketData>);
          if ((socket.data as InternSocketData).insights) runtime?.broadcastViewers();
        }
      },
      error(error) { logger.error("Realtime WebSocket handler error", { error }); },
    },
  });

  return {
    server,
    getStats: presence.getStats,
    attachInternship,
    async stop() {
      if (stopped) return;
      stopped = true;
      await runtime?.close();
      presence.stop();
      await server.stop(true);
    },
  };
}

export async function createInternshipServer({ domain, secret, port = 3003, hostname = "127.0.0.1", allowedOrigins = [], mailer = createInternshipMailer(), siteOrigin = internshipEnv("INTERNSHIP_SITE_ORIGIN", "INTERN_SITE_ORIGIN") || "http://localhost:3000" }: { domain: Domain; secret: string; port?: number; hostname?: string; allowedOrigins?: string[]; mailer?: ReturnType<typeof createInternshipMailer>; siteOrigin?: string }) {
  const instance = createRealtimeServer({ port, hostname, allowedOrigins });
  const internship = await instance.attachInternship({ domain, secret, mailer, siteOrigin });
  return { ...instance, auth: internship.auth };
}

export function createPresenceServer(options: { port?: number; hostname?: string; allowedOrigins?: string[]; broadcastIntervalMs?: number; log?: boolean } = {}) {
  return createRealtimeServer({
    port: options.port ?? 3003,
    hostname: options.hostname,
    allowedOrigins: options.allowedOrigins,
    presenceBroadcastIntervalMs: options.broadcastIntervalMs,
    presenceLog: options.log,
  });
}
