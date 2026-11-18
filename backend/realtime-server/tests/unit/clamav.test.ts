import { expect, test } from "bun:test";
import { createServer } from "node:net";
import { scanWithClamAv } from "../../src/infrastructure/files/clamav";

async function scanner(verdict: string | null, run: (port: number, received: () => Buffer) => Promise<void>) {
  let received = Buffer.alloc(0);
  const server = createServer(socket => {
    socket.on("data", chunk => {
      received = Buffer.concat([received, Buffer.from(chunk)]);
      if (received.length >= 10 && received.subarray(-4).equals(Buffer.alloc(4))) {
        if (verdict === null) socket.end(); else socket.write(verdict + "\0");
      }
    });
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try { await run((server.address() as any).port, () => received); }
  finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}
test("clamd INSTREAM framing sends exact bytes and requires explicit OK", async () => {
  const bytes = new TextEncoder().encode("%PDF-test");
  await scanner("stream: OK", async (port, received) => {
    expect(await scanWithClamAv(bytes, "127.0.0.1", port)).toBe(true);
    expect(received().subarray(0, 10).toString()).toBe("zINSTREAM\0");
    expect(received().readUInt32BE(10)).toBe(bytes.length);
    expect(received().subarray(14, -4)).toEqual(Buffer.from(bytes));
  });
});
test("malware returns false and scanner errors never return clean", async () => {
  const bytes = new TextEncoder().encode("test");
  await scanner("stream: Eicar-Test-Signature FOUND", async port => { expect(await scanWithClamAv(bytes, "127.0.0.1", port)).toBe(false); });
  for (const verdict of ["stream: size limit exceeded ERROR", null]) await scanner(verdict, async port => { await expect(scanWithClamAv(bytes, "127.0.0.1", port)).rejects.toThrow(); });
});
