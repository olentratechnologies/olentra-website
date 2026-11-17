import LegalPage from "@/components/site/LegalPage";
import JsonLd from "@/components/JsonLd";
import { legalPages } from "@/data/legal";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";

export const metadata = buildMetadata({
  title: legalPages.privacy.title,
  description: legalPages.privacy.description,
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  const page = legalPages.privacy;

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: page.title, path: "/privacy-policy" },
        ])}
      />
      <LegalPage
        title={page.title}
        eyebrow={page.eyebrow}
        description={page.description}
        effectiveDate={page.effectiveDate}
        lastUpdated={page.lastUpdated}
        version={page.version}
        summaryNotice={page.summaryNotice}
        sections={page.sections}
        path="/privacy-policy"
      />
    </>
  );
}
