import { blogs } from "@/data/blogs";
import { servicePages } from "@/data/service_pages";
import { absoluteUrl } from "@/lib/site";

export default function sitemap() {
  const staticRoutes = [
    "",
    "/about",
    "/contact",
    "/services",
    "/products",
    "/products/olentra-ai-studio",
    "/products/olenbot",
    "/blogs",
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

  return entries;
}
