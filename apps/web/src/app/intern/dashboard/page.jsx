import InternDashboard from "@/components/intern/dashboard/InternDashboard";

export const metadata = {
  title: { absolute: "Internship Analytics Dashboard | Olentra Technologies" },
  description:
    "Your Olentra internship program, at a glance. Applications, interns, projects, and program analytics.",
  robots: { index: false, follow: false },
};

export default function InternDashboardPage() {
  return <InternDashboard />;
}
