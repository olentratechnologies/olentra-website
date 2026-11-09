export const HEALTH_RESPONSE = new Response('{"ok":true}', {
  headers: { "content-type": "application/json", "cache-control": "no-cache" },
});

export function healthResponse() {
  return HEALTH_RESPONSE.clone();
}
