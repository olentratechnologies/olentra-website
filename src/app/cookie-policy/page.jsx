import LegalPage from "@/components/site/LegalPage";
import { legalPages } from "@/data/legal";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: legalPages.cookies.title,
  description: legalPages.cookies.description,
  path: "/cookie-policy",
});

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title={legalPages.cookies.title}
      description={legalPages.cookies.description}
      sections={legalPages.cookies.sections}
      path="/cookie-policy"
    />
  );
}
