import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Olenbot",
  description:
    "Olenbot is an AI-powered outbound calling and lead intelligence platform for scalable conversion and outreach operations.",
  path: "/products/olenbot",
  keywords: [
    "olenbot",
    "ai outbound calling platform",
    "lead intelligence automation",
  ],
});

export default function OlenbotLayout({ children }) {
  return children;
}
