import LegalPage from "@/components/site/LegalPage";
import { legalPages } from "@/data/legal";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: legalPages.security.title,
  description: legalPages.security.description,
  path: "/security",
});

export default function SecurityPage() {
  return (
    <LegalPage
      title={legalPages.security.title}
      description={legalPages.security.description}
      sections={legalPages.security.sections}
      path="/security"
    />
  );
}
