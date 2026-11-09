import { expect, test } from "bun:test";
import { createPresenceServer } from "../../src/app/create-service";

type Frame = { type: string; activeVisitors: number; totalConnections: number; timestamp: number };
async function fixture() {
  const instance = createPresenceServer({ port: 0, hostname: "127.0.0.1", log: false });
  const clients: WebSocket[] = [];
  async function connect(query: string) {
    const socket = new WebSocket(`ws://127.0.0.1:${instance.server.port}/ws?${query}`);
    clients.push(socket);
    const frames: Frame[] = [], raw: string[] = [];
    const pending = new Set<() => void>();
    socket.addEventListener("message", event => {
      const text = String(event.data); raw.push(text);
      try { const frame = JSON.parse(text); if (frame.type === "presence") frames.push(frame); } catch {}
      for (const notify of [...pending]) notify();
    });
    function wait<T>(read: () => T | undefined) {
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(check); reject(new Error("Timed out waiting for WebSocket frame")); }, 2000);
        function check() { const value = read(); if (value !== undefined) { clearTimeout(timer); pending.delete(check); resolve(value); } }
        pending.add(check); check();
      });
    }
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("WebSocket connection deadline exceeded")), 2000);
      socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("WebSocket connection failed")); }, { once: true });
    });
    const count = (active: number, total?: number, from = 0) => wait(() => {
      const latest = frames.at(-1);
      return frames.length > from && latest?.activeVisitors === active && (total === undefined || latest.totalConnections === total) ? latest : undefined;
    });
    async function transition<T>(action: () => T | Promise<T>, active: number, total: number) {
      const watermark = frames.length;
      const result = await action();
      await count(active, total, watermark);
      return result;
    }
    return { socket, frames, raw, wait, count, transition };
  }
  return { instance, connect, async stop() { for (const client of clients) client.terminate(); await instance.stop(); } };
}

test("real sockets observe 0→1→2→1→0 with isolated ephemeral-port server", async () => {
  const f = await fixture();
  try {
    const dashboard = await f.connect("role=dashboard"); await dashboard.count(0, 1);
    const one = await dashboard.transition(() => f.connect("role=visitor&visitorId=one"), 1, 2);
    const two = await dashboard.transition(() => f.connect("role=visitor&visitorId=two"), 2, 3);
    await dashboard.transition(() => one.socket.close(), 1, 2);
    await dashboard.transition(() => two.socket.close(), 0, 1);
    expect(f.instance.getStats().broadcasts).toBe(4);
  } finally { await f.stop(); }
});

test("same-browser tabs share one user and duplicate legacy caller IDs cannot delete another connection", async () => {
  const f = await fixture();
  try {
    const d = await f.connect("role=dashboard"); await d.count(0, 1);
    let one!: Awaited<ReturnType<typeof f.connect>>;
    const two = await d.transition(async () => {
      one = await f.connect("role=visitor&visitorId=browser&id=reused");
      return f.connect("role=visitor&visitorId=browser&id=reused");
    }, 1, 3);
    await d.transition(() => one.socket.close(), 1, 2);
    let legacyOne!: Awaited<ReturnType<typeof f.connect>>;
    const legacyTwo = await d.transition(async () => {
      legacyOne = await f.connect("role=visitor&id=reused");
      return f.connect("role=visitor&id=reused");
    }, 3, 4);
    await d.transition(() => legacyOne.socket.close(), 2, 3);
    await d.transition(() => { legacyTwo.socket.close(); two.socket.close(); }, 0, 1);
  } finally { await f.stop(); }
});

test("initial snapshots and dashboard membership totals are current; legacy messages remain compatible", async () => {
  const f = await fixture();
  try {
    const visitor = await f.connect("role=visitor&visitorId=existing");
    expect(f.instance.getStats()).toMatchObject({ activeVisitors: 1, snapshots: 0, broadcasts: 0 });
    const first = await f.connect("role=dashboard"); await first.count(1, 2);
    const second = await first.transition(() => f.connect("role=dashboard"), 1, 3); await second.count(1, 3);
    await first.transition(() => second.socket.close(), 1, 2);
    first.socket.send("ping"); expect(await first.wait(() => first.raw.find(text => text === "pong"))).toBe("pong");
    first.socket.send(JSON.stringify({ type: "ping" }));
    await first.wait(() => first.raw.find(text => text.includes('"type":"pong"')));
    const before = first.frames.length; first.socket.send(JSON.stringify({ type: "get_presence" }));
    await first.wait(() => first.frames.length > before ? first.frames.at(-1) : undefined);
    const stats = await (await fetch(new URL("/stats", f.instance.server.url))).json();
    expect(stats).toMatchObject({ activeVisitors: 1, totalConnections: 2, dashboardSubscribers: 1 });
    const health = await (await fetch(new URL("/health", f.instance.server.url))).json() as Record<string, unknown>;
    expect(health).toMatchObject({ status: "healthy", activeVisitors: 1, dashboardSubscribers: 1 });
    expect(typeof health.uptimeSeconds).toBe("number"); expect(typeof health.memoryUsageMb).toBe("number");
    await first.transition(() => visitor.socket.close(), 0, 1);
  } finally { await f.stop(); }
});

test("stored browser IDs support the frontend alphabet including dots and colons", async () => {
  const f = await fixture();
  try {
    const id = encodeURIComponent("browser.profile:region_01-uuid");
    await f.connect("role=visitor&visitorId=" + id);
    await f.connect("role=visitor&visitorId=" + id);
    const dashboard = await f.connect("role=dashboard");
    await dashboard.count(1, 3);
  } finally { await f.stop(); }
});
