import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Olentra AI Studio",
  description:
    "Olentra AI Studio is a full-stack enterprise AI product studio for turning direction into launch-ready software workflows.",
  path: "/products/olentra-ai-studio",
  image: "/images/branding/og/og-product-ai-studio.jpg",
  keywords: [
    "olentra ai studio",
    "enterprise ai product studio",
    "multi-agent orchestration platform",
  ],
});

export default function OlentraAiStudioLayout({ children }) {
  return children;
}
