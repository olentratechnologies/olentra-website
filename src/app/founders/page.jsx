import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import FoundersExperience from "@/components/founders/FoundersExperience";
import { founders } from "@/data/founders";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

const pageMetadata = buildMetadata({
  title: "Founders",
  description:
    "Meet the founders of Olentra Technologies and discover the people, vision, and engineering principles behind our technology company.",
  path: "/founders",
});
export const metadata = {
  ...pageMetadata,
  title: { absolute: pageMetadata.title },
};

export default function FoundersPage() {
  return (
    <>
      <Navbar />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
          { name: "Founders", path: "/founders" },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "Founders of Olentra Technologies",
          url: absoluteUrl("/founders"),
          mainEntity: founders.map((founder) => ({
            "@type": "Person",
            name: founder.name,
            url: absoluteUrl(`/founders#${founder.id}`),
          })),
        }}
      />
      <FoundersExperience />
      <Footer />
    </>
  );
}
