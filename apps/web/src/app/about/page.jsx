import AboutExperience from "@/components/about/AboutExperience";
import JsonLd from "@/components/JsonLd";
import { founders } from "@/data/founders";
import { buildMetadata, breadcrumbSchema, organizationSchema } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

const pageMetadata = buildMetadata({
  title: "About",
  description:
    "Discover Olentra Technologies, our founders, shared vision, and the engineering principles behind our enterprise software, AI, and cloud platforms.",
  path: "/about",
});

export const metadata = {
  ...pageMetadata,
  title: { absolute: pageMetadata.title },
};

export default function AboutPage() {
  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About Olentra Technologies",
          url: absoluteUrl("/about"),
          mainEntity: founders.map((founder) => ({
            "@type": "Person",
            name: founder.name,
            jobTitle: founder.title,
            image: absoluteUrl(founder.image),
            url: absoluteUrl(`/about#${founder.id}`),
          })),
        }}
      />
      <AboutExperience />
    </>
  );
}
