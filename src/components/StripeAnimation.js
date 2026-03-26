const engagementSteps = [
  {
    title: 'Discovery',
    description: 'Scope, goals, and success metrics aligned with stakeholders.',
  },
  {
    title: 'Architecture',
    description: 'System design, data flows, and delivery plan approved.',
  },
  {
    title: 'Build',
    description: 'Iterative delivery with weekly updates and QA checkpoints.',
  },
  {
    title: 'Launch',
    description: 'Production rollout, monitoring, and risk mitigation.',
  },
  {
    title: 'Optimize',
    description: 'Performance, cost, and roadmap improvements post‑launch.',
  },
];

export default function StripeAnimation() {
  return (
    <section data-theme="light" className="py-12 md:py-16 bg-slate-50 relative overflow-hidden transition-colors duration-500">
      <div className="absolute inset-0 bg-cyber-grid-light pointer-events-none" />
      <div className="max-w-5xl mx-auto px-5 md:px-8">
        <div
          className="bg-white border border-slate-200 rounded-xl p-4 md:p-7 relative z-10 shadow-lg shadow-slate-200/50"
        >
          <div className="max-w-2xl">
            <h3 className="text-[1.1rem] md:text-[1.55rem] leading-[1.12] font-semibold text-slate-900">
              A clear engagement model designed for teams.
            </h3>
            <p className="mt-3 text-[0.95rem] md:text-[1.05rem] leading-[1.4] font-medium text-slate-600">
              Transparent milestones, predictable delivery, and measurable outcomes.
            </p>
          </div>

          <div className="mt-7 grid grid-cols-1 md:grid-cols-5 gap-3">
            {engagementSteps.map((step, index) => (
              <div key={step.title} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">
                  Step {index + 1}
                </div>
                <div className="mt-2 text-[0.95rem] font-bold text-slate-900 uppercase tracking-tight">
                  {step.title}
                </div>
                <p className="mt-2 text-[0.8rem] text-slate-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
