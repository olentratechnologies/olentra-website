import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import JsonLd from "@/components/JsonLd";
import PrimaryCtaBand from "@/components/site/PrimaryCtaBand";
import PageHero from "@/components/site/PageHero";
import SectionIntro from "@/components/site/SectionIntro";
import { blogs, getBlogBySlug } from "@/data/blogs";
import { articleSchema, breadcrumbSchema, buildMetadata } from "@/lib/seo";



export function generateStaticParams() {
  return blogs.map((blog) => ({ slug: blog.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const blog = getBlogBySlug(slug);
  if (!blog) {
    return buildMetadata({
      title: "Blog",
      description: "Enterprise engineering insights by Olentra Technologies.",
      path: "/blogs",
    });
  }

  return buildMetadata({
    title: blog.seoTitle || blog.title,
    description: blog.metaDescription || blog.excerpt,
    path: `/blogs/${blog.slug}`,
    image: blog.image,
    keywords: [blog.category.toLowerCase(), "enterprise insights", "olentra blog"],
  });
}

export default async function BlogDetailPage({ params }) {
  const { slug } = await params;
  const blog = getBlogBySlug(slug);
  if (!blog) notFound();

  const related = blogs.filter((item) => item.slug !== blog.slug).slice(0, 3);

  return (
    <main className="relative bg-[#020617] text-white font-sans selection:bg-primary/30 selection:text-white">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Blogs", path: "/blogs" },
          { name: blog.title, path: `/blogs/${blog.slug}` },
        ])}
      />
      <JsonLd
        data={articleSchema({
          title: blog.title,
          description: blog.metaDescription || blog.excerpt,
          path: `/blogs/${blog.slug}`,
          image: blog.image,
          publishedTime: blog.publishedTime,
          updatedTime: blog.updatedTime,
        })}
      />

      <Navbar />
      <PageHero
        eyebrow={blog.category}
        title={blog.title}
        description={blog.excerpt}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Blogs", href: "/blogs" },
          { label: blog.title },
        ]}
        primaryCta={{ href: "/#contact", label: "Discuss This Topic" }}
        secondaryCta={{ href: "/blogs", label: "Back to Blogs" }}
        image={blog.image}
        panelLabel="ARTICLE_NODE"
        panelTag={`${blog.readTime} | ${blog.date}`}
      />

      <section className="relative py-24 md:py-28 bg-white text-slate-900">
        <div className="absolute inset-0 bg-cyber-grid-light opacity-[0.05] pointer-events-none" />
        <article className="max-w-4xl mx-auto px-6 md:px-12 relative z-10 space-y-10">
          {blog.content.map((section) => (
            <section key={section.heading} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-8 md:p-10 shadow-lg shadow-slate-200/40">
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 mb-5">
                {section.heading}
              </h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </article>
      </section>

      <section className="relative py-24 md:py-28 bg-[#020617]">
        <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-[0.06] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative">
          <SectionIntro
            dark
            eyebrow="Related Insights"
            title="Continue reading"
            accent="our field notes"
            description="Additional enterprise delivery insights connected to product strategy, operations, and engineering execution."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {related.map((item) => (
              <article
                key={item.slug}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
              >
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary mb-3">
                  {item.category}
                </p>
                <h3 className="text-lg font-black uppercase tracking-tight text-white">{item.title}</h3>
                <p className="mt-3 text-slate-400 text-sm leading-relaxed">{item.excerpt}</p>
                <Link
                  href={item.href}
                  className="mt-6 inline-flex items-center px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.22em] border border-white/20 text-white hover:border-primary hover:text-primary transition-all"
                  style={{
                    clipPath:
                      "polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)",
                  }}
                >
                  Open Article
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
