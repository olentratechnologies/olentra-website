import { companyInfo } from "@/data/company";
import { absoluteUrl, siteConfig } from "./site";

export function buildMetadata({
  title,
  description,
  path = "/",
  keywords = [],
  image: imageOverride,
}) {
  // Every page shares the same company card unless a page passes its own image.
  const image = imageOverride?.url || siteConfig.ogImage;
  const imageWidth = imageOverride?.width || 1200;
  const imageHeight = imageOverride?.height || 630;
  const imageAlt = imageOverride?.alt || companyInfo.name;
  const canonical = absoluteUrl(path);
  const resolvedTitle = title ? `${title} | ${companyInfo.name}` : siteConfig.defaultTitle;

  return {
    title: resolvedTitle,
    description,
    keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      title: resolvedTitle,
      description,
      url: canonical,
      siteName: companyInfo.name,
      locale: siteConfig.locale,
      type: "website",
      images: [
        {
          url: absoluteUrl(image),
          width: imageWidth,
          height: imageHeight,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description,
      images: [absoluteUrl(image)],
    },
  };
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: companyInfo.name,
    legalName: companyInfo.legalName,
    url: siteConfig.url,
    logo: absoluteUrl(companyInfo.logo),
    email: companyInfo.email,
    telephone: companyInfo.phone,
    description: companyInfo.description,
    sameAs: companyInfo.socials.map((item) => item.href),
    address: companyInfo.locations.map((location) => ({
      "@type": "PostalAddress",
      addressLocality: location,
    })),
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: companyInfo.name,
    url: siteConfig.url,
    description: companyInfo.description,
  };
}

export function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function serviceSchema({ name, description, path }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: name,
    name,
    description,
    url: absoluteUrl(path),
    provider: {
      "@type": "Organization",
      name: companyInfo.name,
      url: siteConfig.url,
    },
    areaServed: companyInfo.serviceArea,
  };
}

export function productSchema({ name, description, path, image }) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: absoluteUrl(path),
    image: absoluteUrl(image || siteConfig.ogImage),
    creator: {
      "@type": "Organization",
      name: companyInfo.name,
    },
  };
}

export function articleSchema({
  title,
  description,
  path,
  image,
  publishedTime,
  updatedTime,
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: absoluteUrl(image || siteConfig.ogImage),
    datePublished: publishedTime,
    dateModified: updatedTime || publishedTime,
    author: {
      "@type": "Organization",
      name: companyInfo.name,
    },
    publisher: {
      "@type": "Organization",
      name: companyInfo.name,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(companyInfo.logo),
      },
    },
    mainEntityOfPage: absoluteUrl(path),
  };
}
