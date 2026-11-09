import { expect, test } from "bun:test";
import { parseInternRpcFrame, rpcErrorResponse, rpcResponse } from "../../src/interfaces/websocket/protocol";

test("internship JSON-RPC contract preserves request and response envelopes", () => {
  const request = parseInternRpcFrame(JSON.stringify({ id: "req-1", type: "request", method: "intern.public", params: {} }));
  expect(request).toEqual({ id: "req-1", type: "request", method: "intern.public", params: {} });
  expect(rpcResponse("req-1", { ok: true })).toEqual({ type: "response", id: "req-1", ok: true, data: { ok: true } });
  expect(rpcErrorResponse("req-1", { code: "FORBIDDEN", message: "Denied" })).toEqual({ type: "response", id: "req-1", ok: false, error: { code: "FORBIDDEN", message: "Denied" } });
});
