import LegalPage from "@/components/site/LegalPage";
import { legalPages } from "@/data/legal";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: legalPages.terms.title,
  description: legalPages.terms.description,
  path: "/terms-of-service",
});

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title={legalPages.terms.title}
      description={legalPages.terms.description}
      sections={legalPages.terms.sections}
      path="/terms-of-service"
    />
  );
}
