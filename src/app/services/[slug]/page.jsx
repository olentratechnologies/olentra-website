import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import JsonLd from "@/components/JsonLd";
import PrimaryCtaBand from "@/components/site/PrimaryCtaBand";
import PageHero from "@/components/site/PageHero";
import SectionIntro from "@/components/site/SectionIntro";
import { getServicePageBySlug, servicePages } from "@/data/service_pages";
import { buildMetadata, breadcrumbSchema, serviceSchema } from "@/lib/seo";

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generateStaticParams() {
  return servicePages.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const service = getServicePageBySlug(slug);
  if (!service) {
    return buildMetadata({
      title: "Service",
      description: "Enterprise service details from Olentra Technologies.",
      path: "/services",
    });
  }

  return buildMetadata({
    title: `${service.name} Services`,
    description: service.heroDescription,
    path: `/services/${service.slug}`,
    keywords: [
      `${service.name.toLowerCase()} services`,
      "enterprise consulting",
      "olentra technologies services",
    ],
  });
}

export default async function ServiceDetailPage({ params }) {
  const { slug } = await params;
  const service = getServicePageBySlug(slug);
  if (!service) notFound();

  return (
    <main className="relative bg-[#020617] text-white font-sans selection:bg-primary/30 selection:text-white">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
          { name: service.name, path: `/services/${service.slug}` },
        ])}
      />
      <JsonLd
        data={serviceSchema({
          name: service.name,
          description: service.heroDescription,
          path: `/services/${service.slug}`,
        })}
      />

      <Navbar />
      <PageHero
        eyebrow="Service Detail"
        title={service.heroTitle}
        description={service.heroDescription}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Services", href: "/services" },
          { label: service.name },
        ]}
        primaryCta={{ href: "/#contact", label: "Start Service Discussion" }}
        secondaryCta={{ href: "/services", label: "All Services" }}
        image="/images/backgrounds/cyber-bg.png"
        panelLabel="SERVICE_NODE"
        panelTag={service.name}
      />

      <section className="relative py-24 md:py-28 bg-white text-slate-900">
        <div className="absolute inset-0 bg-cyber-grid-light opacity-[0.05] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <SectionIntro
            eyebrow="Service Outcomes"
            title="What this lane"
            accent="delivers"
            description="Outcome-focused delivery designed for leadership teams that need clear business impact and reliable execution."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {service.outcomes.map((outcome) => (
              <article
                key={outcome}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-7 shadow-lg shadow-slate-200/40"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3">
                  Outcome
                </p>
                <p className="text-slate-700 font-semibold leading-relaxed">{outcome}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 md:py-28 bg-[#020617]">
        <div className="absolute inset-0 bg-[url('/images/ui/grid.svg')] opacity-[0.06] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative">
          <SectionIntro
            dark
            eyebrow="Capabilities"
            title={service.name}
            accent="scope"
            description="Specific capabilities currently available under this service cluster."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {service.services.map((item) => (
              <article
                id={slugify(item.title)}
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-xl"
              >
                <h3 className="text-xl font-black uppercase tracking-tight text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">{item.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-md border border-white/15 text-[10px] font-black uppercase tracking-wider text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 md:py-28 bg-white text-slate-900">
        <div className="absolute inset-0 bg-cyber-grid-light opacity-[0.05] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
          <SectionIntro
            eyebrow="Delivery Pattern"
            title="How we execute"
            accent="this service"
            description="A practical structure designed to reduce risk and keep your team aligned around measurable delivery milestones."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {service.delivery.map((step) => (
              <article
                key={step}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-7 shadow-lg shadow-slate-200/40"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3">
                  Execution Step
                </p>
                <p className="text-slate-700 font-semibold leading-relaxed">{step}</p>
              </article>
            ))}
          </div>
          <div className="mt-10">
            <Link
              href="/#contact"
              className="inline-flex items-center px-8 py-4 text-[12px] font-black uppercase tracking-[0.24em] bg-primary text-white hover:bg-blue-700 transition-all"
              style={{
                clipPath:
                  "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)",
              }}
            >
              Discuss this service with Olentra
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
