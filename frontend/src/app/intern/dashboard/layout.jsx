import { RoleGuard } from "@/components/intern/InternshipProvider";
import DashboardShell from "@/components/intern/dashboard/DashboardShell";
import { InternThemeProvider } from "@/components/intern/InternTheme";
import { INTERN_THEME_BOOTSTRAP } from "@/lib/intern/theme.mjs";

export const metadata = {
  title: {
    default: "Internship Dashboard",
    template: "%s | Olentra Technologies Internships",
  },
  robots: { index: false, follow: false },
};

export default function InternshipDashboardLayout({ children }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: INTERN_THEME_BOOTSTRAP }} />
      <InternThemeProvider>
        <RoleGuard role="company">
          <DashboardShell>{children}</DashboardShell>
        </RoleGuard>
      </InternThemeProvider>
    </>
  );
}
