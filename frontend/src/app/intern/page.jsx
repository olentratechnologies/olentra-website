import { permanentRedirect } from "next/navigation";

export default async function LegacyInternPage({ searchParams }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === "string") query.append(key, item);
    }
  }
  permanentRedirect("/careers/intern" + (query.size ? "?" + query.toString() : ""));
}
