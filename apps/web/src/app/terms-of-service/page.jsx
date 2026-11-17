import LegalPage from "@/components/site/LegalPage";
import JsonLd from "@/components/JsonLd";
import { legalPages } from "@/data/legal";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";

export const metadata = buildMetadata({
  title: legalPages.terms.title,
  description: legalPages.terms.description,
  path: "/terms-of-service",
});

export default function TermsOfServicePage() {
  const page = legalPages.terms;

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: page.title, path: "/terms-of-service" },
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
        path="/terms-of-service"
      />
    </>
  );
}
