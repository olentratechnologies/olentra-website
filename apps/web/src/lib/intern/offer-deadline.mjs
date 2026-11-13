/** Plain-language time left on an offer, or null when it has no deadline. */
export function offerTimeLeft(expiresOn, now = Date.now()) {
  if (!expiresOn) return null;
  const ms = new Date(expiresOn).getTime() - now;
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return { expired: true, label: "This offer has expired" };
  const hours = Math.floor(ms / 3_600_000), days = Math.floor(hours / 24);
  if (days >= 2) return { expired: false, label: `${days} days left to decide`, urgent: false };
  if (hours >= 1) return { expired: false, label: `${hours} ${hours === 1 ? "hour" : "hours"} left to decide`, urgent: true };
  return { expired: false, label: "Less than an hour left to decide", urgent: true };
}
