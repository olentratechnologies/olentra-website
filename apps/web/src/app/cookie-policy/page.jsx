import LegalPage from "@/components/site/LegalPage";
import JsonLd from "@/components/JsonLd";
import { legalPages } from "@/data/legal";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";

export const metadata = buildMetadata({
  title: legalPages.cookies.title,
  description: legalPages.cookies.description,
  path: "/cookie-policy",
});

export default function CookiePolicyPage() {
  const page = legalPages.cookies;

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: page.title, path: "/cookie-policy" },
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
        path="/cookie-policy"
      />
    </>
  );
}
