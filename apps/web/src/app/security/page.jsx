import LegalPage from "@/components/site/LegalPage";
import JsonLd from "@/components/JsonLd";
import { legalPages } from "@/data/legal";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";

export const metadata = buildMetadata({
  title: legalPages.security.title,
  description: legalPages.security.description,
  path: "/security",
});

export default function SecurityPage() {
  const page = legalPages.security;

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: page.title, path: "/security" },
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
        path="/security"
      />
    </>
  );
}
