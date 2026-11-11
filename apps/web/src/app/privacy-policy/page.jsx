import LegalPage from "@/components/site/LegalPage";
import { legalPages } from "@/data/legal";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: legalPages.privacy.title,
  description: legalPages.privacy.description,
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title={legalPages.privacy.title}
      description={legalPages.privacy.description}
      sections={legalPages.privacy.sections}
      path="/privacy-policy"
    />
  );
}
