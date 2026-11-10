import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Keep the lock in the kernel, not in a PID file: a killed startup must not
// leave a stale lock that prevents the next dev:all from recovering.
export async function acquireStartupLock(root, { signal, timeoutMs = 30000 } = {}) {
  signal?.throwIfAborted();
  if (process.platform === "win32") return async () => {};

  const canonicalRoot = await realpath(root);
  const directory = path.join(tmpdir(), `olentra-service-locks-${process.getuid()}`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  signal?.throwIfAborted();
  const key = createHash("sha256").update(canonicalRoot).digest("hex");
  const lockFile = path.join(directory, `${key}.lock`);
  const seconds = String(Math.max(1, Math.ceil(timeoutMs / 1000)));
  const command = process.platform === "darwin" ? "lockf" : "flock";
  const args = process.platform === "darwin"
    ? ["-k", "-t", seconds, lockFile]
    : ["-x", "-w", seconds, lockFile];
  // The helper's only job is to hold the OS lock while this process keeps its
  // stdin open. Parent exit closes the pipe, including after SIGKILL.
  args.push(process.execPath, "-e", 'process.stdin.resume(); process.stdout.write("locked\\n");');
  const child = spawn(command, args, { detached: true, stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  let acquired = false;
  let closed = false;
  let releasing;
  let resolveClosed;
  const completion = new Promise(resolve => { resolveClosed = resolve; });

  function stopHelper() {
    if (!closed && child.pid) {
      try { process.kill(-child.pid, "SIGKILL"); }
      catch (error) { if (error.code !== "ESRCH") child.kill("SIGKILL"); }
    }
  }

  async function release() {
    if (releasing) return releasing;
    releasing = (async () => {
      signal?.removeEventListener("abort", abort);
      child.stdin.end();
      // An aborted waiter has no helper yet to consume EOF. Stop its lock
      // command directly; after acquisition EOF normally releases the lock.
      if (!acquired) stopHelper();
      const timer = setTimeout(stopHelper, 1000);
      try { await completion; }
      finally { clearTimeout(timer); }
    })();
    return releasing;
  }

  function abort() {
    void release();
  }

  child.stdin.on("error", () => {}); // The lock command may time out before EOF.
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", data => { stderr += data; });
  signal?.addEventListener("abort", abort, { once: true });

  return new Promise((resolve, reject) => {
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", data => {
      stdout += data;
      if (!acquired && stdout.includes("locked\n")) {
        acquired = true;
        if (signal?.aborted) {
          void release();
          reject(signal.reason);
        } else {
          resolve(release);
        }
      }
    });
    child.once("error", error => {
      reject(new Error(`Cannot serialize dev startup: ${command} failed: ${error.message}`, { cause: error }));
    });
    child.once("close", code => {
      closed = true;
      signal?.removeEventListener("abort", abort);
      resolveClosed();
      if (!acquired) {
        reject(signal?.aborted ? signal.reason : new Error(
          `Cannot acquire dev startup lock (exit ${code}). ${stderr.trim() || "Another startup is still running; retry shortly."}`
        ));
      }
    });
    if (signal?.aborted) abort();
  });
}
