/**
 * Turns an applicant's intro video link into a safe embeddable player URL.
 * Only https links on known video hosts are embedded; anything else returns
 * null so the UI falls back to a plain "open link" button.
 */
const ID = /^[A-Za-z0-9_-]{6,64}$/;

const providers = [
  {
    provider: "YouTube",
    hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com", "youtube-nocookie.com"],
    id(url) {
      if (url.hostname === "youtu.be") return url.pathname.split("/")[1];
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
      return match?.[1];
    },
    embed: (id) => `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
  },
  {
    provider: "Loom",
    hosts: ["loom.com", "www.loom.com"],
    id: (url) => url.pathname.match(/^\/(?:share|embed)\/([^/?#]+)/)?.[1],
    embed: (id) => `https://www.loom.com/embed/${id}`,
  },
  {
    provider: "Vimeo",
    hosts: ["vimeo.com", "www.vimeo.com", "player.vimeo.com"],
    id: (url) => url.pathname.match(/^\/(?:video\/)?(\d{6,12})(?:[/?#]|$)/)?.[1],
    embed: (id) => `https://player.vimeo.com/video/${id}`,
  },
  {
    provider: "Google Drive",
    hosts: ["drive.google.com"],
    id(url) {
      const match = url.pathname.match(/^\/file\/d\/([^/?#]+)/);
      return match?.[1] || (url.pathname === "/open" ? url.searchParams.get("id") : null);
    },
    embed: (id) => `https://drive.google.com/file/d/${id}/preview`,
  },
];

export function toEmbed(value) {
  let url;
  try { url = new URL(String(value || "").trim()); } catch { return null; }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  for (const entry of providers) {
    if (!entry.hosts.includes(host)) continue;
    const id = entry.id(url);
    return id && ID.test(id) ? { provider: entry.provider, embedUrl: entry.embed(id) } : null;
  }
  return null;
}
