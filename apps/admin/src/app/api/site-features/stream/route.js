import { readSiteFeatures, publicSiteFeatureState, watchSiteFeatures } from "@olentra/site-features/server/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request) {
  let cleanup = () => {};
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false, revision = -1, checking = false;
      const send = state => { if (!closed && state.revision > revision) { revision = state.revision; controller.enqueue(encoder.encode("event: features\ndata: " + JSON.stringify(state) + "\n\n")); } };
      const check = async () => { if (checking || closed) return; checking = true; try { send(publicSiteFeatureState(await readSiteFeatures())); } catch {} finally { checking = false; } };
      const unwatch = watchSiteFeatures(send), poll = setInterval(check, 1000), heartbeat = setInterval(() => { if (!closed) controller.enqueue(encoder.encode(": keep-alive\n\n")); }, 15000);
      cleanup = () => { if (closed) return; closed = true; clearInterval(poll); clearInterval(heartbeat); unwatch(); request.signal.removeEventListener("abort", cleanup); try { controller.close(); } catch {} };
      request.signal.addEventListener("abort", cleanup, { once: true });
      if (request.signal.aborted) cleanup(); else await check();
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive", "X-Accel-Buffering": "no" } });
}
