/** Bounded loopback benchmark. Never connects to an existing presence server. */
import os from "node:os";
import path from "node:path";

type Sample = { elapsedMs: number; intervalMs: number; phase: string; rssBytes: number; heapUsedBytes: number; cpuOneCorePercent: number; eventLoopLagMs: number[]; counters: unknown };
type Summary = { samples: number; min: number | null; mean: number | null; p50: number | null; p95: number | null; p99: number | null; max: number | null };
const sleep = (ms: number) => Bun.sleep(ms);
const now = () => performance.now();
const round = (n: number) => Math.round(n * 1000) / 1000;
function summary(values: number[]): Summary {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const percentile = (p: number) => sorted.length ? round(sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)]!) : null;
  return { samples: sorted.length, min: percentile(0), mean: sorted.length ? round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : null, p50: percentile(.5), p95: percentile(.95), p99: percentile(.99), max: percentile(1) };
}

async function childServer() {
  const { createPresenceServer } = await import("../src/app/create-service.ts");
  const instance = createPresenceServer({ port: 0, hostname: "127.0.0.1", broadcastIntervalMs: 100, allowedOrigins: [], log: false });
  const server = instance.server;
  let phase = "startup", previousCpu = process.cpuUsage(), previousAt = now(), timerAt = now(), delays: number[] = [];
  const started = now();
  const lagTimer = setInterval(() => { const time = now(); delays.push(Math.max(0, time - timerAt - 10)); timerAt = time; }, 10);
  const sample = () => {
    const time = now(), cpu = process.cpuUsage(), elapsed = time - previousAt, memory = process.memoryUsage();
    const record: Sample = { elapsedMs: round(time - started), intervalMs: round(elapsed), phase, rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, cpuOneCorePercent: round(((cpu.user - previousCpu.user) + (cpu.system - previousCpu.system)) / (elapsed * 10)), eventLoopLagMs: delays, counters: instance.getStats() };
    delays = []; previousCpu = cpu; previousAt = time;
    process.send?.({ type: "sample", value: record });
  };
  const sampleTimer = setInterval(sample, 1000);
  process.on("message", async (message: unknown) => {
    const data = message as { type: string; value?: string };
    if (data.type === "phase") { sample(); phase = data.value || "unknown"; }
    if (data.type === "stop") {
      clearInterval(lagTimer); clearInterval(sampleTimer); sample();
      const final = instance.getStats();
      await instance.stop();
      process.send?.({ type: "stopped", value: final });
      process.disconnect?.();
    }
  });
  process.send?.({ type: "ready", port: server.port, pid: process.pid });
}

type Options = { users: number; tabs: number; dashboards: number; duration: number; batchSize: number; pulses: number; pulseUsers: number; output: string };
function options(): Options {
  const values: Record<string, string> = {};
  for (let i = 2; i < process.argv.length; i++) {
    const argument = process.argv[i]!;
    if (argument === "--help") {
      console.log("bun run bench-presence.ts [--users 1000] [--tabs 2] [--dashboards 10] [--duration 120] [--batch-size 100] [--pulses 40] [--pulse-users 25] [--output benchmarks/name.json]\nStarts its own isolated loopback server on port 0. Duration is the hold phase in seconds; setup and shutdown are additional. Limits: users<=5000, total visitor sockets<=20000, dashboards<=50, duration<=600 seconds.");
      process.exit(0);
    }
    if (!argument.startsWith("--") || !process.argv[i + 1] || process.argv[i + 1]!.startsWith("--")) throw new Error("Expected --option value; use --help.");
    values[argument.slice(2)] = process.argv[++i]!;
  }
  const allowed = ["users", "tabs", "dashboards", "duration", "batch-size", "pulses", "pulse-users", "output"];
  for (const key of Object.keys(values)) if (!allowed.includes(key)) throw new Error("Unknown option: " + key);
  const integer = (key: string, fallback: number, min: number, max: number) => { const value = Number(values[key] ?? fallback); if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${key} must be an integer from ${min} to ${max}.`); return value; };
  const users = integer("users", 1000, 1, 5000), tabs = integer("tabs", 2, 1, 8);
  if (users * tabs > 20000) throw new Error("This bounded benchmark allows at most 20000 visitor sockets.");
  const reportDirectory = path.join(import.meta.dir, "benchmarks"), output = path.resolve(import.meta.dir, values.output || path.join("benchmarks", `presence-${new Date().toISOString().replace(/[:.]/g, "-")}.json`));
  if (!output.startsWith(reportDirectory + path.sep) || !output.endsWith(".json")) throw new Error("Output must be a .json file under backend/realtime-server/benchmarks (relative paths start at the realtime package).");
  return { users, tabs, dashboards: integer("dashboards", 10, 1, 50), duration: integer("duration", 120, 5, 600), batchSize: integer("batch-size", 100, 1, 500), pulses: integer("pulses", 40, 1, 100), pulseUsers: Math.min(users, integer("pulse-users", 25, 1, 500)), output };
}

type Dashboard = { socket: WebSocket; count: number | null; sequence: number; firstSnapshotMs: number | null; createdAt: number; messages: number };
type Transition = { label: string; expected: number; start: number; seen: Set<Dashboard>; observations: number[]; resolve: () => void };
type Check = { name: string; ok: boolean; details?: unknown };

async function benchmark(config: Options) {
  const startedAt = new Date().toISOString(), started = now();
  const checks: Check[] = [], serverSamples: Sample[] = [], driverSamples: Omit<Sample, "counters" | "eventLoopLagMs">[] = [], sockets = new Set<WebSocket>(), dashboards: Dashboard[] = [], browserSockets = new Map<string, WebSocket[]>();
  const freshness: number[] = [], finalFreshness: number[] = [], firstSnapshots: number[] = [], reconnectSnapshots: number[] = [], broadcastTimes: number[] = [], phaseDurations: Record<string, number> = {};
  let phase = "startup", transition: Transition | null = null, port = 0, lastServerStats: unknown = null, childStopped = false, benchmarkError: string | null = null, frameErrors = 0, socketErrors = 0, unexpectedCloses = 0;
  const intentionallyClosed = new WeakSet<WebSocket>();
  let readyResolve!: () => void;
  const ready = new Promise<void>(resolve => { readyResolve = resolve; });
  const child = Bun.spawn({ cmd: [process.execPath, import.meta.path, "--server-child"], cwd: import.meta.dir, stdout: "pipe", stderr: "pipe", ipc(message: unknown) {
    const data = message as { type: string; port?: number; value?: unknown };
    if (data.type === "ready") { port = data.port!; readyResolve(); }
    if (data.type === "sample") serverSamples.push(data.value as Sample);
    if (data.type === "stopped") { childStopped = true; lastServerStats = data.value; }
  } });
  const childStdout = new Response(child.stdout).text(), childStderr = new Response(child.stderr).text();
  let previousCpu = process.cpuUsage(), previousAt = now();
  const driverTimer = setInterval(() => { const time = now(), cpu = process.cpuUsage(), memory = process.memoryUsage(); driverSamples.push({ elapsedMs: round(time - started), intervalMs: round(time - previousAt), phase, rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, cpuOneCorePercent: round(((cpu.user - previousCpu.user) + (cpu.system - previousCpu.system)) / ((time - previousAt) * 10)) }); previousCpu = cpu; previousAt = time; }, 1000);
  const checkpoint = (name: string, ok: boolean, details?: unknown) => { checks.push({ name, ok, details }); if (!ok) throw new Error(name + ": " + JSON.stringify(details)); };
  const timeout = async <T>(promise: Promise<T>, milliseconds: number, label: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(label + " timed out")), milliseconds); })]); }
    finally { if (timer) clearTimeout(timer); }
  };
  const stats = async (): Promise<Record<string, number>> => { const response = await fetch(`http://127.0.0.1:${port}/stats`); if (!response.ok) throw new Error("Isolated server stats failed."); return await response.json() as Record<string, number>; };
  const setPhase = (value: string) => { phase = value; child.send({ type: "phase", value }); };
  const close = (socket: WebSocket) => { intentionallyClosed.add(socket); if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) socket.close(1000, "benchmark"); };
  const open = (role: "visitor" | "dashboard", id: string, dashboard?: Dashboard): Promise<WebSocket> => new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?role=${role}&visitorId=${encodeURIComponent(id)}&path=%2Fbenchmark`);
    sockets.add(socket);
    if (dashboard) { dashboard.socket = socket; dashboard.createdAt = now(); }
    const timer = setTimeout(() => { close(socket); reject(new Error("Socket connection timed out.")); }, 15000);
    socket.onopen = () => { clearTimeout(timer); resolve(socket); };
    socket.onerror = () => { socketErrors++; clearTimeout(timer); reject(new Error("WebSocket error in isolated benchmark.")); };
    socket.onclose = () => { sockets.delete(socket); if (!intentionallyClosed.has(socket) && phase !== "shutdown") unexpectedCloses++; };
    if (dashboard) socket.onmessage = event => {
      try {
        const value = JSON.parse(String(event.data)); if (value.type !== "presence") return;
        const time = now(); dashboard.sequence++; dashboard.messages++; dashboard.count = value.activeVisitors;
        if (dashboard.firstSnapshotMs == null) { dashboard.firstSnapshotMs = time - dashboard.createdAt; }
        else if (dashboard === dashboards[0] && (phase === "load" || phase === "hold")) broadcastTimes.push(time);
        if (transition && dashboard.count === transition.expected && !transition.seen.has(dashboard)) {
          transition.seen.add(dashboard); transition.observations.push(time - transition.start);
          if (transition.seen.size === dashboards.length) transition.resolve();
        }
      } catch { frameErrors++; }
    };
  });
  const openDashboard = async (id: string) => {
    const dashboard: Dashboard = { socket: null as unknown as WebSocket, count: null, sequence: 0, firstSnapshotMs: null, createdAt: now(), messages: 0 };
    dashboards.push(dashboard); await open("dashboard", id, dashboard);
    await timeout((async () => { while (dashboard.firstSnapshotMs == null) await sleep(2); })(), 5000, "First dashboard snapshot");
    return dashboard;
  };
  const openBrowsers = async (ids: string[]) => {
    const jobs = ids.flatMap(id => Array.from({ length: config.tabs }, () => ({ id })));
    for (let i = 0; i < jobs.length; i += config.batchSize) {
      await Promise.all(jobs.slice(i, i + config.batchSize).map(async ({ id }) => { const socket = await open("visitor", id); const list = browserSockets.get(id) || []; list.push(socket); browserSockets.set(id, list); }));
      await sleep(10);
    }
  };
  const countTransition = async (label: string, expected: number, mutate: () => Promise<unknown> | unknown, measure = true) => {
    let resolve!: () => void;
    const done = new Promise<void>(accept => { resolve = accept; });
    transition = { label, expected, start: now(), seen: new Set(), observations: [], resolve };
    try {
      await mutate(); await timeout(done, 5000, label);
      const observed = transition.observations;
      if (measure) { freshness.push(...observed); finalFreshness.push(Math.max(...observed)); }
      const value = await stats(); checkpoint(label, value.activeVisitors === expected && value.totalConnections === expected * config.tabs + dashboards.length && dashboards.every(item => item.count === expected), { expected, server: value.activeVisitors, totalConnections: value.totalConnections, subscriberCounts: dashboards.map(item => item.count) });
    } finally { transition = null; }
  };
  const waitStableCount = async (expected: number) => {
    await timeout((async () => { while (!dashboards.every(item => item.count === expected) || (await stats()).activeVisitors !== expected) await sleep(10); })(), 5000, "Stable count");
  };
  const ids = Array.from({ length: config.users }, (_, i) => `bench-browser-${i}`);
  let baselineStats: unknown = null, loadedStats: unknown = null, zeroVisitorStats: unknown = null, finalStats: unknown = null, serverExitCode: number | null = null, holdElapsedMs = 0;
  try {
    await timeout(ready, 10000, "Isolated server startup");
    checkpoint("Ephemeral port is valid and isolated", port > 0, { port });
    console.log(`Isolated server ready; loading ${config.users} browsers × ${config.tabs} tabs + ${config.dashboards} dashboards.`);
    for (let i = 0; i < config.dashboards; i++) { const item = await openDashboard("bench-dashboard-" + i); firstSnapshots.push(item.firstSnapshotMs!); }
    baselineStats = await stats(); checkpoint("Dashboard subscribers do not count as visitors", (baselineStats as Record<string, number>).activeVisitors === 0, baselineStats);
    setPhase("load"); const loadStarted = now();
    await openBrowsers(ids); await waitStableCount(config.users); phaseDurations.loadMs = round(now() - loadStarted);
    loadedStats = await stats(); checkpoint("Distinct browsers count once across all tabs", (loadedStats as Record<string, number>).activeVisitors === config.users && (loadedStats as Record<string, number>).totalConnections === config.users * config.tabs + config.dashboards, loadedStats);
    setPhase("tab-deduplication");
    if (config.tabs > 1) {
      const selected = ids.slice(0, Math.min(100, config.users));
      for (const id of selected) close(browserSockets.get(id)!.shift()!);
      await sleep(350); checkpoint("Closing one tab preserves each browser", (await stats()).activeVisitors === config.users && dashboards.every(item => item.count === config.users));
      await Promise.all(selected.map(async id => browserSockets.get(id)!.push(await open("visitor", id))));
      await sleep(200); await waitStableCount(config.users);
    }
    setPhase("hold"); const holdStarted = now(), holdDeadline = holdStarted + config.duration * 1000;
    const pulseInterval = Math.max(300, Math.floor(config.duration * 1000 / (config.pulses + 1)));
    let nextLog = holdStarted + 15000;
    for (let pulse = 0; pulse < config.pulses; pulse++) {
      const scheduled = holdStarted + (pulse + 1) * pulseInterval;
      if (scheduled + 1000 > holdDeadline) break;
      if (now() < scheduled) await sleep(scheduled - now());
      const selected = Array.from({ length: config.pulseUsers }, (_, i) => ids[(pulse * config.pulseUsers + i) % ids.length]!);
      await countTransition("Churn down " + (pulse + 1), config.users - selected.length, () => { for (const id of selected) { browserSockets.get(id)?.forEach(close); browserSockets.delete(id); } });
      await countTransition("Churn recovery " + (pulse + 1), config.users, () => openBrowsers(selected));
      if (now() >= nextLog) { console.log(`Hold ${Math.round((now() - holdStarted) / 1000)}/${config.duration}s; ${pulse + 1} count pulses verified.`); nextLog = now() + 15000; }
    }
    while (now() < holdDeadline) { await sleep(Math.min(1000, holdDeadline - now())); if (now() >= nextLog) { console.log(`Hold ${Math.round((now() - holdStarted) / 1000)}/${config.duration}s; all counts correct.`); nextLog = now() + 15000; } }
    holdElapsedMs = round(now() - holdStarted); await waitStableCount(config.users);
    setPhase("resync");
    const previous = dashboards.pop()!; close(previous.socket); await sleep(50);
    const reconnected = await openDashboard("bench-dashboard-reconnected"); reconnectSnapshots.push(reconnected.firstSnapshotMs!);
    checkpoint("Reconnected subscriber gets the current count", reconnected.count === config.users, { count: reconnected.count });
    const sequence = reconnected.sequence, requestedAt = now(); reconnected.socket.send(JSON.stringify({ type: "get_presence" }));
    await timeout((async () => { while (reconnected.sequence === sequence) await sleep(1); })(), 3000, "Explicit presence resync");
    phaseDurations.explicitResyncMs = round(now() - requestedAt); checkpoint("Explicit resync returns the current count", reconnected.count === config.users);
    setPhase("drain");
    await countTransition("All visitor tabs disconnected produces zero", 0, () => { for (const list of browserSockets.values()) list.forEach(close); browserSockets.clear(); }, false);
    zeroVisitorStats = await stats();
    dashboards.forEach(item => close(item.socket)); await sleep(250); finalStats = await stats();
    checkpoint("All connections are released", (finalStats as Record<string, number>).dashboardSubscribers === 0 && (finalStats as Record<string, number>).totalConnections === 0, finalStats);
    checkpoint("No malformed frames or socket errors", frameErrors === 0 && socketErrors === 0 && unexpectedCloses === 0, { frameErrors, socketErrors, unexpectedCloses });
  } catch (error) { benchmarkError = error instanceof Error ? error.message : String(error); console.error("Benchmark failed:", benchmarkError); }
  finally {
    phase = "shutdown"; for (const socket of sockets) close(socket);
    await sleep(100); clearInterval(driverTimer);
    try { child.send({ type: "stop" }); serverExitCode = await timeout(child.exited, 5000, "Server clean shutdown"); }
    catch { child.kill(); serverExitCode = await child.exited; }
  }
  const stdout = (await childStdout).slice(-4000), stderr = (await childStderr).slice(-4000);
  checks.push({ name: "Isolated server shuts down cleanly", ok: childStopped && serverExitCode === 0, details: { childStopped, serverExitCode } });
  const rollingMax = (windowMs: number) => { let left = 0, max = 0; for (let right = 0; right < broadcastTimes.length; right++) { while (broadcastTimes[right]! - broadcastTimes[left]! >= windowMs) left++; max = Math.max(max, right - left + 1); } return max; };
  const holdServer = serverSamples.filter(item => item.phase === "hold"), holdDriver = driverSamples.filter(item => item.phase === "hold");
  const report = {
    schemaVersion: 1, startedAt, finishedAt: new Date().toISOString(), success: !benchmarkError && checks.every(item => item.ok), error: benchmarkError,
    configuration: { ...config, output: path.basename(config.output), visitorSocketsAtTarget: config.users * config.tabs, broadcastIntervalMs: 100 },
    environment: { bun: Bun.version, platform: process.platform, architecture: process.arch, kernel: os.release(), cpuModel: os.cpus()[0]?.model || "unknown", logicalCpus: os.cpus().length, systemMemoryMiB: round(os.totalmem() / 1048576), serverAndDriverSeparateProcesses: true, transport: "loopback TCP WebSockets; one native Bun server process", serverPort: port },
    timing: { totalMs: round(now() - started), holdMs: holdElapsedMs, ...phaseDurations },
    latencyMs: { firstSnapshot: summary(firstSnapshots), reconnectSnapshot: summary(reconnectSnapshots), eachSubscriberCountFreshness: summary(freshness), lastSubscriberCountFreshness: summary(finalFreshness) },
    broadcasts: { observedOnFirstDashboardDuringLoadAndHold: broadcastTimes.length, maxRolling100ms: rollingMax(100), maxRolling1s: rollingMax(1000), finalCounters: lastServerStats },
    server: { holdSamples: holdServer.length, baselineStats, loadedStats, zeroVisitorStats, finalStats, rssMiB: summary(holdServer.map(item => item.rssBytes / 1048576)), heapUsedMiB: summary(holdServer.map(item => item.heapUsedBytes / 1048576)), cpuOneCorePercent: summary(holdServer.map(item => item.cpuOneCorePercent)), eventLoopTimerLagMs: summary(holdServer.flatMap(item => item.eventLoopLagMs)), samples: serverSamples.map(({ eventLoopLagMs, ...item }) => ({ ...item, eventLoopTimerLagMs: summary(eventLoopLagMs) })) },
    driver: { rssMiB: summary(holdDriver.map(item => item.rssBytes / 1048576)), cpuOneCorePercent: summary(holdDriver.map(item => item.cpuOneCorePercent)) },
    checks, childOutput: { stdout, stderr },
    methodology: ["A browser ID is reused by all tabs. Every dashboard is excluded from the visitor count.", "Freshness begins before initiating each controlled disconnect/reconnect; it includes handshake or close processing, 100ms coalescing, loopback delivery and driver observation. Every subscriber must observe the target count within 5s.", "The hold phase includes bounded down/up pulses and otherwise preserves the target load. Sampled RSS/CPU belong only to the server child; the separate driver shares this machine and can still compete for resources.", "CPU percent is process user+system CPU time divided by elapsed wall time; 100% means one CPU core. Summaries include partial phase-boundary samples, which can show brief spikes; inspect each raw intervalMs before interpreting a maximum as sustained CPU. Event-loop lag is nonnegative overshoot of a 10ms setInterval, not a native profiler histogram.", "Broadcast windows count presence frames observed by the first dashboard during load/hold, excluding its initial snapshot and explicit resync. Window boundaries and timer jitter can permit two frames within a rolling100ms interval.", "This is a single local machine/single Bun server process test, not an internet, distributed, TLS, proxy, mobile, browser-rendering, or production capacity guarantee. No existing server or external visitor traffic is used."]
  };
  const output = path.resolve(config.output); await Bun.write(output, JSON.stringify(report, null, 2) + "\n");
  const display = (value: Summary) => `p50 ${value.p50 ?? "n/a"}, p95 ${value.p95 ?? "n/a"}, p99 ${value.p99 ?? "n/a"}, max ${value.max ?? "n/a"}`;
  const markdown = `# Presence benchmark\n\n${report.success ? "Passed the configured local test." : "Failed; inspect errors and checks."} Measured on ${startedAt}.\n\n- Load: ${config.users} browser IDs, ${config.tabs} tabs per ID (${config.users * config.tabs} visitor sockets), ${config.dashboards} dashboard subscribers.\n- Hold: ${holdElapsedMs / 1000}s; separate driver/server Bun ${Bun.version} processes; 100ms coalescing.\n- Hardware: ${report.environment.cpuModel}, ${report.environment.logicalCpus} logical CPUs, ${report.environment.systemMemoryMiB} MiB RAM, ${process.platform}/${process.arch}.\n- Server RSS MiB: ${display(report.server.rssMiB)}.\n- Server CPU % of one core: ${display(report.server.cpuOneCorePercent)}.\n- Server10ms timer lag in ms: ${display(report.server.eventLoopTimerLagMs)}.\n- Initial snapshot ms: ${display(report.latencyMs.firstSnapshot)}.\n- Per-subscriber count freshness ms: ${display(report.latencyMs.eachSubscriberCountFreshness)}.\n- Last-subscriber count freshness ms: ${display(report.latencyMs.lastSubscriberCountFreshness)}.\n- Broadcast reception maximum: ${report.broadcasts.maxRolling100ms} per rolling100ms; ${report.broadcasts.maxRolling1s} per rolling1s.\n- Checks: ${checks.filter(item => item.ok).length}/${checks.length} passed.\n\n## Measurement limits\n\n${report.methodology.map(item => "- " + item).join("\n")}\n\nRaw measurements and individual checks: [${path.basename(output)}](${path.basename(output)}).\n`;
  await Bun.write(output.replace(/\.json$/, "") + ".md", markdown);
  console.log(JSON.stringify({ success: report.success, output: path.basename(output), freshnessP95Ms: report.latencyMs.eachSubscriberCountFreshness.p95, serverRssPeakMiB: report.server.rssMiB.max, checks: checks.length }));
  if (!report.success) process.exitCode = 1;
}

if (process.argv.includes("--server-child")) await childServer();
else { try { await benchmark(options()); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; } }
