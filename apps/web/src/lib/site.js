import { companyInfo } from "@/data/company";

export const siteConfig = {
  name: companyInfo.name,
  legalName: companyInfo.legalName,
  shortName: companyInfo.shortName,
  url: companyInfo.domain,
  description: companyInfo.description,
  defaultTitle: `${companyInfo.name} | Enterprise Engineering, AI, and Digital Product Delivery`,
  titleTemplate: `%s | ${companyInfo.name}`,
  ogImage: companyInfo.defaultOgImage,
  locale: "en_US",
};

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, siteConfig.url).toString();
}
