import LegalPage from "@/components/site/LegalPage";
import { legalPages } from "@/data/legal";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: legalPages.accessibility.title,
  description: legalPages.accessibility.description,
  path: "/accessibility",
});

export default function AccessibilityPage() {
  return (
    <LegalPage
      title={legalPages.accessibility.title}
      description={legalPages.accessibility.description}
      sections={legalPages.accessibility.sections}
      path="/accessibility"
    />
  );
}
