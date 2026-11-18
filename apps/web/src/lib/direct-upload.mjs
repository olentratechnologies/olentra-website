/** PUT bytes without application credentials; verify readiness via the application API. */
export async function transferDirectUpload({ file, intent, endpoint, headers, readResult, client, fetcher = fetch, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now }) {
  let pushed = false;
  const unsubscribe = client.addFileListener(data => { if (data.id === intent.id) pushed = true; });
  // Notifications accelerate status refresh; HTTP remains authoritative after reconnects.
  void client.request("files.subscribe", { id: intent.id, accessToken: intent.accessToken }).catch(() => {});
  const statusHeaders = { ...headers, "X-File-Token": intent.accessToken };
  const statusUrl = `${endpoint}/intern/files/uploads/${encodeURIComponent(intent.id)}`;
  try {
    const uploaded = await fetcher(intent.uploadUrl, { method: "PUT", credentials: "omit", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file, signal: AbortSignal.timeout(240_000) });
    if (!uploaded.ok) throw new Error("File transfer failed. Please retry your upload.");
    // Reconciliation also processes the durable intent if this notification is lost.
    await fetcher(`${statusUrl}/complete`, { method: "POST", credentials: "omit", headers: statusHeaders, signal: AbortSignal.timeout(15_000) }).then(readResult).catch(() => {});
    const deadline = now() + 180_000;
    while (now() < deadline) {
      let status;
      try { status = await readResult(await fetcher(statusUrl, { headers: statusHeaders, credentials: "omit", signal: AbortSignal.timeout(15_000) })); }
      catch (error) { if ([401, 403, 404].includes(error.status)) throw error; await wait(2000); continue; }
      if (status.status === "ready") return { id: status.id, name: status.name, type: status.type, size: status.size, accessToken: intent.accessToken };
      if (status.status === "rejected" || status.status === "deleting") throw new Error("The file could not pass security checks. Choose a valid file and try again.");
      await wait(pushed ? 100 : 1500); pushed = false;
    }
    throw Object.assign(new Error("Your file is still being checked. Please try again shortly."), { uploadId: intent.id });
  } finally { unsubscribe(); client.close(); }
}
