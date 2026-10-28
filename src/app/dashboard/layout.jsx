export const metadata = {
  title: "Enterprise Analytics & Telemetry Dashboard | Olentra",
  description: "Executive operations, traffic intelligence, B2B pipeline, and security audit hub.",
};

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {children}
    </div>
  );
}
