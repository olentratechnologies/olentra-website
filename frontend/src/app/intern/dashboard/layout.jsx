import { RoleGuard } from "@/components/intern/InternshipProvider";
import DashboardShell from "@/components/intern/dashboard/DashboardShell";

export const metadata = {
  title: {
    default: "Internship Dashboard",
    template: "%s | Olentra Technologies Internships",
  },
  robots: { index: false, follow: false },
};

export default function InternshipDashboardLayout({ children }) {
  return (
    <RoleGuard role="company">
      <DashboardShell>{children}</DashboardShell>
    </RoleGuard>
  );
}
