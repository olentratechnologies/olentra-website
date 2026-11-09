import { describe, expect, test } from "bun:test";
import { createPresenceTracker } from "../../src/modules/presence/presence-tracker";

function fixture() {
  let time = 0, next = 0;
  const scheduled = new Map<number, { at: number; callback: () => void }>();
  const frames: Array<{ type: string; activeVisitors: number; totalConnections: number; timestamp: number }> = [];
  const tracker = createPresenceTracker({
    now: () => time,
    schedule(callback, delay) { const id = ++next; scheduled.set(id, { at: time + delay, callback }); return id; },
    cancel(handle) { scheduled.delete(handle as number); },
    broadcast(payload) { frames.push(JSON.parse(payload)); return payload.length; },
  });
  return {
    tracker, frames, scheduled,
    advance(delay: number) {
      const end = time + delay;
      while (true) {
        const entry = [...scheduled].filter(([, item]) => item.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!entry) break;
        scheduled.delete(entry[0]); time = entry[1].at; entry[1].callback();
      }
      time = end;
    },
  };
}

describe("single-node presence core", () => {
  test("counts browsers by connection refcounts and legacy visitors independently", () => {
    const { tracker } = fixture();
    tracker.addVisitor("one", "browser"); tracker.addVisitor("two", "browser");
    tracker.addVisitor("legacy-one"); tracker.addVisitor("legacy-two");
    expect(tracker.getStats()).toMatchObject({ activeVisitors: 3, totalConnections: 4 });
    tracker.remove("one");
    expect(tracker.getStats()).toMatchObject({ activeVisitors: 3, totalConnections: 3 });
    tracker.remove("two");
    expect(tracker.getStats()).toMatchObject({ activeVisitors: 2, totalConnections: 2 });
    expect(tracker.remove("two")).toBe(false);
  });
  test("does no automatic serialization, timers or fanout without dashboards", () => {
    const { tracker, advance, scheduled } = fixture();
    for (let index = 0; index < 100; index++) tracker.addVisitor(String(index), "browser-" + index);
    advance(1000);
    expect(scheduled.size).toBe(0);
    expect(tracker.getStats()).toMatchObject({ activeVisitors: 100, broadcasts: 0, snapshots: 0, serializedBytes: 0 });
    tracker.addDashboard("dashboard");
    expect(JSON.parse(tracker.serialize())).toMatchObject({ activeVisitors: 100, totalConnections: 101 });
    expect(scheduled.size).toBe(0);
  });
  test("coalesces a burst into one latest snapshot exactly at 100ms", () => {
    const { tracker, advance, frames, scheduled } = fixture();
    tracker.addDashboard("dashboard");
    for (let index = 0; index < 50; index++) tracker.addVisitor(String(index), "browser-" + index);
    expect(scheduled.size).toBe(1);
    expect(tracker.getStats()).toMatchObject({ activeVisitors: 50, totalConnections: 51 });
    advance(99); expect(frames).toHaveLength(0);
    advance(1); expect(frames).toEqual([{ type: "presence", activeVisitors: 50, totalConnections: 51, timestamp: 100 }]);
    advance(1000); expect(frames).toHaveLength(1);
  });
  test("skips net-zero changes and reschedules future changes", () => {
    const { tracker, advance, frames } = fixture();
    tracker.addDashboard("dashboard"); tracker.addVisitor("temporary", "browser"); tracker.remove("temporary");
    advance(100); expect(frames).toHaveLength(0);
    tracker.addVisitor("new", "browser"); advance(100);
    expect(frames).toHaveLength(1);
  });
  test("dashboard-only membership changes update totalConnections", () => {
    const { tracker, advance, frames } = fixture();
    tracker.addDashboard("one"); tracker.addDashboard("two"); advance(100);
    expect(frames[0]).toMatchObject({ activeVisitors: 0, totalConnections: 2 });
    tracker.remove("two"); advance(100);
    expect(frames[1]).toMatchObject({ activeVisitors: 0, totalConnections: 1 });
  });
  test("connection ownership is idempotent and anonymous namespace cannot collide with browser IDs", () => {
    const { tracker } = fixture();
    expect(tracker.addVisitor("a")).toBe(true);
    expect(tracker.addVisitor("a", "other")).toBe(false);
    expect(tracker.addDashboard("a")).toBe(false);
    tracker.addVisitor("b", "a");
    expect(tracker.getStats()).toMatchObject({ activeVisitors: 2, totalConnections: 2 });
    tracker.remove("a");
    expect(tracker.getStats()).toMatchObject({ activeVisitors: 1, totalConnections: 1 });
  });
  test("last dashboard and shutdown cancel pending work", () => {
    const { tracker, advance, frames, scheduled } = fixture();
    tracker.addDashboard("d"); tracker.addVisitor("v", "b"); tracker.remove("d");
    expect(scheduled.size).toBe(0); advance(100); expect(frames).toHaveLength(0);
    tracker.addDashboard("d2"); tracker.addVisitor("v2", "b2"); tracker.stop(); tracker.stop();
    expect(scheduled.size).toBe(0); advance(1000);
    expect(tracker.getStats()).toMatchObject({ activeVisitors: 0, totalConnections: 0, pendingBroadcast: false });
    expect(tracker.addDashboard("late")).toBe(false);
  });
  test("counts native backpressure outcomes without building a replay queue", () => {
    for (const result of [-1, 0]) {
      let callback: (() => void) | undefined;
      const tracker = createPresenceTracker({ broadcast: () => result, schedule(fn) { callback = fn; return 1; }, cancel() {} });
      tracker.addDashboard("d"); tracker.addVisitor("v"); callback?.();
      expect(tracker.getStats()).toMatchObject({ broadcasts: 1, backpressureEvents: result === -1 ? 1 : 0, droppedBroadcasts: result === 0 ? 1 : 0, pendingBroadcast: false });
    }
  });
});
