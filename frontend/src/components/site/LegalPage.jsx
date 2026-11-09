import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "./PageHero";

export default function LegalPage({ title, description, sections, path }) {
  return (
    <main className="relative bg-[#020617] text-white font-sans selection:bg-primary/30 selection:text-white">
      <Navbar />
      <PageHero
        eyebrow="Trust Center"
        title={title}
        description={description}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: title },
        ]}
        primaryCta={{ href: "/#contact", label: "Contact Olentra" }}
        secondaryCta={{ href: "/services", label: "Explore Services" }}
        image="/images/backgrounds/cyber-bg.png"
        panelLabel={path.replace("/", "").toUpperCase().replace(/-/g, "_")}
        panelTag="Policy and Trust"
      />

      <section className="relative py-24 md:py-28 bg-white text-slate-900">
        <div className="absolute inset-0 bg-cyber-grid-light opacity-[0.05] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 md:px-12 relative z-10 space-y-10">
          {sections.map((section) => (
            <article key={section.heading} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-8 md:p-10 shadow-lg shadow-slate-200/40">
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 mb-5">
                {section.heading}
              </h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
