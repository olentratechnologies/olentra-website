import LegalPage from "@/components/site/LegalPage";
import JsonLd from "@/components/JsonLd";
import { legalPages } from "@/data/legal";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";

export const metadata = buildMetadata({
  title: legalPages.accessibility.title,
  description: legalPages.accessibility.description,
  path: "/accessibility",
});

export default function AccessibilityPage() {
  const page = legalPages.accessibility;

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: page.title, path: "/accessibility" },
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
        path="/accessibility"
      />
    </>
  );
}
