import { expect, test } from "bun:test";
import { createFilesRoutes } from "../../src/interfaces/http/files.routes";

function setup(account: any = null, verified = true) {
  const calls: any[] = [];
  const direct: any = { begin: async (data: any) => { calls.push(data); return { id: "file", status: "uploading" }; } };
  const api = createFilesRoutes({
    auth: { verify: async () => ({ account }) } as any, bucket: {} as any, files: { findOne: async () => null } as any,
    direct, withCors: () => new Headers(), sendJson: (data, _origin, status = 200) => Response.json(data, { status }),
    limiter: { consume: async (...args: any[]) => { calls.push(args); } } as any,
    ...(verified ? { resumeGrants: { draftId: async (token: string) => { if (token !== "verified") throw new Error("Invalid grant"); return "draft"; } } as any } : {}),
  });
  const request = (size: string, kind = "resume", token = account ? "user" : "") => new Request("https://api.test/intern/files/uploads", { method: "POST", headers: { "x-file-name": "cv.pdf", "x-file-kind": kind, "x-file-size": size, "x-resume-grant": "verified", ...(token ? { authorization: `Bearer ${token}` } : {}) } });
  return { api, calls, request };
}
test("anonymous direct resumes require verification and preserve rate limiting", async () => {
  const f = setup(); expect((await f.api.upload(f.request("20"), null)).status).toBe(201);
  expect(f.calls[0]).toEqual(["verifiedResume", null, "draft"]);
  expect(f.calls[1]).toMatchObject({ kind: "resume", size: 20, type: "application/pdf" });
  const disabled = setup(null, false); await expect(disabled.api.upload(disabled.request("20"), null)).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
});
test("direct work uploads require an intern and record application ownership", async () => {
  const anonymous = setup(); await expect(anonymous.api.upload(anonymous.request("20", "work"), null)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  const staff = setup({ role: "company", id: "staff" }); await expect(staff.api.upload(staff.request("20"), null)).rejects.toMatchObject({ code: "FORBIDDEN" });
  const intern = setup({ role: "intern", id: "account", applicationId: "app-a" }); await intern.api.upload(intern.request("20", "work"), null);
  expect(intern.calls[1]).toMatchObject({ ownerApplicationId: "app-a", kind: "work" });
});
test("invalid declared sizes are rejected before creating a PAR", async () => {
  const f = setup(); for (const size of ["0", "-1", "NaN", "3.5", "5242881"]) await expect(f.api.upload(f.request(size), null)).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  expect(f.calls).toHaveLength(0);
});
test("pending and rejected files cannot be downloaded", async () => {
  const f = setup(); await expect(f.api.download(new Request("https://api.test/intern/files/file"), null)).rejects.toMatchObject({ code: "NOT_FOUND" });
});
