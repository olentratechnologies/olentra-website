import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Olentra AI Studio",
  description:
    "Olentra AI Studio is an AI video generator that turns a creative brief into publish-ready cinematic video with consistent characters, multi-model generation and safe social publishing.",
  path: "/products/olentra-ai-studio",
  keywords: [
    "olentra ai studio",
    "ai video generator",
    "ai cinematic video",
    "ai video for brands and agencies",
  ],
});

export default function OlentraAiStudioLayout({ children }) {
  return children;
}
