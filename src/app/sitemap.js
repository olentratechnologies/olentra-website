import { blogs } from "@/data/blogs";
import { servicePages } from "@/data/service_pages";
import { absoluteUrl } from "@/lib/site";
import { readSiteFeatures } from "@/lib/server/site-features.mjs";
import { siteRouteStatus } from "@/lib/site-feature-rules.mjs";
export const dynamic = "force-dynamic";

export default async function sitemap() {
  const { environments } = await readSiteFeatures();
  const staticRoutes = [
    "",
    "/about",
    "/services",
    "/products",
    "/products/olentra-ai-studio",
    "/products/olenbot",
    "/products/dailysupply",
    "/blogs",
    "/careers/intern",
    "/privacy-policy",
    "/terms-of-service",
    "/cookie-policy",
    "/security",
    "/accessibility",
  ];

  const entries = [
    ...staticRoutes.map((path) => ({
      url: absoluteUrl(path || "/"),
      lastModified: new Date(),
    })),
    ...servicePages.map((page) => ({
      url: absoluteUrl(`/services/${page.slug}`),
      lastModified: new Date(),
    })),
    ...blogs.map((blog) => ({
      url: absoluteUrl(`/blogs/${blog.slug}`),
      lastModified: new Date(blog.updatedTime || blog.publishedTime),
    })),
  ];

  return entries.filter(entry => siteRouteStatus(new URL(entry.url).pathname, environments.Production) === 200);
}
