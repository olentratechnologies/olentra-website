import { executionProtocol as steps } from '../data/process';

export default function CreativeProcess() {
  return (
    <section
      id="process"
      data-testid="creative-process-section"
      className="relative overflow-hidden bg-[#020617] py-16 md:py-20 font-sans transition-colors duration-500"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(37,99,235,0.05),transparent_40%)]" />

      <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-16">
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-foreground to-muted-foreground/50 uppercase leading-[0.9] tracking-widest drop-shadow-[0_0_10px_rgba(var(--foreground),0.05)]"
          >
            Execution<br />Protocol
          </h2>
          <p
            className="text-sm md:text-base text-muted-foreground max-w-xs leading-relaxed font-medium"
          >
            Observe the deterministic sequence we employ to transmute abstract directives into high-fidelity digital reality.
          </p>
        </div>

        <div className="rounded-[2px] border border-border bg-card/50 backdrop-blur-md p-3 md:p-4 shadow-[inset_0_1px_0_rgba(var(--foreground),0.05),0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_20px_rgba(0,0,0,0.5)]">
          <div className="relative mb-6 h-[1.5px] overflow-hidden rounded-full bg-white/10">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-foreground to-secondary shadow-brand-cyan-glow w-full"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            {steps.map((step, i) => {
              const themeStyles = [
                {
                  blur: 'bg-primary/10 group-hover:bg-primary/20',
                  dot: 'bg-primary/20 border-primary/50 text-primary shadow-brand-cyan-glow',
                  border: 'bg-white/20'
                },
                {
                  blur: 'bg-foreground/10 group-hover:bg-foreground/20',
                  dot: 'bg-foreground/20 border-foreground/50 text-foreground shadow-sm',
                  border: 'bg-white/20'
                },
                {
                  blur: 'bg-secondary/10 group-hover:bg-secondary/20',
                  dot: 'bg-secondary/20 border-secondary/50 text-secondary shadow-brand-purple-glow',
                  border: 'bg-white/20'
                }
              ][i];

              return (
                <article
                  key={step.number}
                  data-testid={`process-step-${step.number}`}
                  className="group glass-card px-5 md:px-6 pt-6 pb-4 min-h-[200px] md:min-h-[220px] flex flex-col relative overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-24 h-24 blur-[40px] rounded-full translate-x-1/2 -translate-y-1/2 transition-colors duration-500 ${themeStyles.blur}`} />
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-sm border text-xs font-bold ${themeStyles.dot}`}>
                    {step.number}
                  </span>
                  <div className="mt-auto pt-6 relative z-10">
                    <div className={`mb-4 h-px w-full ${themeStyles.border}`} />
                    <h3 className="mb-2 text-[1.1rem] md:text-[1.2rem] leading-[1.08] font-bold text-foreground uppercase tracking-wider">
                      {step.title}
                    </h3>
                    <p className="max-w-[95%] text-xs md:text-sm text-muted-foreground leading-[1.4] font-medium">
                      {step.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
