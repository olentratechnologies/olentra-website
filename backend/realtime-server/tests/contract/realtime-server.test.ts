import { expect, test } from "bun:test";
import { createRealtimeServer } from "../../src/app/create-service";

test("one realtime process keeps presence available while MongoDB-backed modules are unavailable", async () => {
  const instance = createRealtimeServer({ port: 0, hostname: "127.0.0.1", allowedOrigins: [] });
  try {
    const health = await fetch(new URL("/health", instance.server.url));
    expect(health.status).toBe(200);
    expect((await health.json() as { status: string }).status).toBe("healthy");

    const stats = await fetch(new URL("/stats", instance.server.url));
    expect(stats.status).toBe(200);

    const presenceSocket = new WebSocket(new URL("/ws?role=dashboard", instance.server.url).toString().replace("http:", "ws:"));
    const firstFrame = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Presence WebSocket did not open")), 2000);
      presenceSocket.onopen = () => { clearTimeout(timer); };
      presenceSocket.onmessage = event => resolve(String(event.data));
      presenceSocket.onerror = () => { clearTimeout(timer); reject(new Error("Presence WebSocket failed")); };
    });
    expect(JSON.parse(firstFrame)).toMatchObject({ type: "presence", activeVisitors: 0, totalConnections: 1 });
    presenceSocket.close();

    const internshipHealth = await fetch(new URL("/intern/health", instance.server.url));
    expect(internshipHealth.status).toBe(503);
    expect(await internshipHealth.json()).toMatchObject({ ok: false, error: { code: "SERVICE_UNAVAILABLE" } });

    const internshipUpgrade = await fetch(new URL("/ws/intern", instance.server.url));
    expect(internshipUpgrade.status).toBe(503);
  } finally {
    await instance.stop();
  }
});
