import Link from "next/link";
import { Feature } from "@/components/site-features";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#020617] text-white px-6 py-24 flex items-center">
      <div className="max-w-4xl mx-auto w-full">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8 md:p-12 shadow-[0_30px_80px_rgba(2,6,23,0.7)]">
          <p className="text-[10px] font-black uppercase tracking-[0.45em] text-primary mb-5">
            Route Not Found
          </p>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-[0.9]">
            This page is not in the
            <span className="text-primary italic"> active build.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-slate-300 leading-relaxed">
            The route you requested does not exist or has moved. Use the main navigation below to
            continue exploring Olentra Technologies.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            {[
              { href: "/", label: "Homepage" },
              { href: "/services", label: "Services", feature: "services" },
              { href: "/products", label: "Products", feature: "products" },
              { href: "/#contact", label: "Contact" },
            ].map((item) => {
              const link = <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center px-6 py-3 text-[11px] font-black uppercase tracking-[0.25em] border border-white/10 bg-white/[0.04] hover:border-primary/60 hover:text-primary transition-all"
                style={{
                  clipPath:
                    "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)",
                }}
              >
                {item.label}
              </Link>;
              return item.feature ? <Feature key={item.href} name={item.feature}>{link}</Feature> : link;
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
