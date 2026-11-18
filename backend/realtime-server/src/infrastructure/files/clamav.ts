import { connect } from "node:net";

export function fileScanMode(value?: string): "clamav" | "disabled" {
  if (!value || value === "clamav") return "clamav";
  if (value === "disabled") return "disabled";
  throw new Error("INTERNSHIP_FILE_SCAN_MODE must be clamav or disabled.");
}

export function createFileScanner(env: NodeJS.ProcessEnv = process.env): (bytes: Uint8Array) => Promise<boolean> {
  if (fileScanMode(env.INTERNSHIP_FILE_SCAN_MODE) === "disabled") return async () => true;
  const port = Number(env.CLAMAV_PORT || 3310);
  if (!env.CLAMAV_HOST || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Configure CLAMAV_HOST and CLAMAV_PORT, or explicitly set INTERNSHIP_FILE_SCAN_MODE=disabled.");
  }
  return bytes => scanWithClamAv(bytes, env.CLAMAV_HOST, port);
}

/** Fail closed: only an explicit clamd OK permits publishing bytes. */
export function scanWithClamAv(bytes: Uint8Array, host = process.env.CLAMAV_HOST, port = Number(process.env.CLAMAV_PORT || 3310)): Promise<boolean> {
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    return Promise.reject(new Error("Configure a private CLAMAV_HOST and valid port"));
  }
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port }); let response = "", settled = false;
    const timer = setTimeout(() => finish(new Error("Scanner timeout")), 45_000);
    const finish = (error?: Error, clean?: boolean) => { if (settled) return; settled = true; clearTimeout(timer); socket.destroy(); error ? reject(error) : resolve(clean!); };
    socket.on("error", error => finish(error));
    socket.on("close", () => { if (!settled) finish(new Error("Scanner closed without verdict")); });
    socket.on("data", chunk => {
      response += chunk.toString();
      if (response.length > 4096) return finish(new Error("Invalid scanner response"));
      if (!response.includes("\0")) return;
      const verdict = response.slice(0, response.indexOf("\0"));
      if (verdict === "stream: OK") finish(undefined, true);
      else if (/^stream: .+ FOUND$/.test(verdict)) finish(undefined, false);
      else finish(new Error("Scanner could not inspect file"));
    });
    socket.on("connect", async () => {
      const write = (chunk: Uint8Array | string) => new Promise<void>((resolve, reject) => socket.write(chunk, error => error ? reject(error) : resolve()));
      try {
        await write("zINSTREAM\0");
        for (let offset = 0; offset < bytes.length && !settled; offset += 65536) {
          const chunk = bytes.subarray(offset, offset + 65536), length = Buffer.alloc(4); length.writeUInt32BE(chunk.length);
          await write(length); await write(chunk);
        }
        if (!settled) await write(Buffer.alloc(4));
      } catch (error) { finish(error as Error); }
    });
  });
}
