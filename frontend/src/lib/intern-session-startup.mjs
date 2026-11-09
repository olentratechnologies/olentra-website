// Restore the cookie and open the socket concurrently, then bind the resulting
// token to that socket before allowing login or revealing workspace data.
export async function prepareInternSession({ restore, connect, authenticate, clear, isActive }) {
  const [restored, connected] = await Promise.allSettled([restore(), connect()]);
  if (!isActive()) return null;
  if (restored.status === "rejected") {
    // Only an explicit rejection invalidates the session. A network/database
    // outage must be retried without clearing a still-valid refresh session.
    if (restored.reason?.code !== "UNAUTHENTICATED") throw restored.reason;
    clear();
  }
  if (connected.status === "rejected") throw connected.reason;
  let account;
  try { account = await authenticate(); }
  catch (error) {
    if (error?.code !== "UNAUTHENTICATED") throw error;
    clear(); account = await authenticate();
  }
  if (!isActive()) return null;
  return { account };
}
