import ServicesExperience from "@/components/services/ServicesExperience";
import JsonLd from "@/components/JsonLd";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";

const servicesMetadata = buildMetadata({
  title: "Services",
  description:
    "Engineering, intelligence, and design. Explore Olentra’s seven connected disciplines, from platform engineering and AI to brand and growth.",
  path: "/services",
  image: "/images/branding/og/og-services.jpg",
});

export const metadata = {
  ...servicesMetadata,
  title: { absolute: servicesMetadata.title },
};

export default function ServicesPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
        ])}
      />
      <ServicesExperience />
    </>
  );
}
