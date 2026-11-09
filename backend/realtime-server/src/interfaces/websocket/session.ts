import type { ServerWebSocket } from "bun";
import type { InternSocketData } from "./protocol";

/** Tracks staff sockets so permission changes can revoke live sessions safely. */
export class StaffSocketRegistry {
  private readonly groups = new Map<string, Set<ServerWebSocket<InternSocketData>>>();

  add(accountId: string, socket: ServerWebSocket<InternSocketData>) {
    let group = this.groups.get(accountId);
    if (!group) this.groups.set(accountId, group = new Set());
    group.add(socket);
  }

  remove(socket: ServerWebSocket<InternSocketData>) {
    const accountId = socket.data.principal?.role === "company" ? socket.data.principal.id : null;
    if (!accountId) return;
    const group = this.groups.get(accountId);
    group?.delete(socket);
    if (!group?.size) this.groups.delete(accountId);
  }

  forAccount(accountId: string) {
    return this.groups.get(accountId) || [];
  }

  all() {
    return this.groups.values();
  }
}
