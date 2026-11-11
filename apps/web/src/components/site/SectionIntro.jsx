export default function SectionIntro({ eyebrow, title, accent, description, dark = false }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-8 h-px bg-primary/50" />
          <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${dark ? "text-primary" : "text-primary"}`}>
            {eyebrow}
          </p>
        </div>
        <h2 className={`text-4xl md:text-5xl font-[950] uppercase leading-[0.9] tracking-tighter ${dark ? "text-white" : "text-slate-900"}`}>
          {title} {accent ? <span className="text-primary italic">{accent}</span> : null}
        </h2>
      </div>
      {description ? (
        <p className={`max-w-md text-sm font-bold uppercase tracking-[0.22em] leading-relaxed ${dark ? "text-slate-400" : "text-slate-500"}`}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
