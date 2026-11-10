import { acquireStartupLock } from "../service-startup-lock.mjs";

const controller = new AbortController();
process.on("message", message => {
  if (message === "abort") controller.abort(new Error("fixture aborted"));
});
try {
  const release = await acquireStartupLock(process.argv[2], { signal: controller.signal, timeoutMs: 5000 });
  process.send?.("locked");
  const message = await new Promise(resolve => process.once("message", resolve));
  if (message === "release") {
    await release();
    await release(); // release is intentionally idempotent.
  }
} catch (error) {
  if (controller.signal.aborted) process.send?.("aborted");
  else {
    console.error(error.message);
    process.exitCode = 1;
  }
}
process.disconnect();
