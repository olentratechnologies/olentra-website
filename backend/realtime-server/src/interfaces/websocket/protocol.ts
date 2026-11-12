import type { Principal } from "../../shared/principal";

export type InternSocketData = { kind: "intern"; token: string | null; principal: Principal | null; insights?: boolean; verifyWindow?: { start: number; count: number }; address?: string };
export type InternRpcRequest = { id?: string; type?: string; method?: string; params?: Record<string, any>; idempotencyKey?: string };

export function parseInternRpcFrame(frame: string | Buffer): InternRpcRequest | null {
  try {
    const request = JSON.parse(typeof frame === "string" ? frame : new TextDecoder().decode(frame)) as InternRpcRequest;
    return request && typeof request === "object" ? request : null;
  } catch {
    return null;
  }
}

export const rpcResponse = (id: string, data: unknown) => ({ type: "response", id, ok: true as const, data });
export const rpcErrorResponse = (id: string, error: { code: string; message: string }) => ({ type: "response", id, ok: false as const, error });
export const readyMessage = () => ({ type: "ready", version: 1 });

/** @deprecated Presence protocol helpers moved to ./presence-protocol. */
export { handleLegacyMessage, parseConnectionQuery } from "./presence-protocol";
