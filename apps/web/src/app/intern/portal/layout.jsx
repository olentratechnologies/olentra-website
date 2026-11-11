import { RoleGuard } from "@/components/intern/InternshipProvider";
import PortalShell from "@/components/intern/portal/PortalShell";
import { InternThemeProvider } from "@/components/intern/InternTheme";

export const metadata = {
  title: {
    default: "My Internship",
    template: "%s | Olentra Technologies Internships",
  },
  robots: { index: false, follow: false },
};

export default function InternPortalLayout({ children }) {
  return (
    <>
      <InternThemeProvider>
        <RoleGuard role="intern">
          <PortalShell>{children}</PortalShell>
        </RoleGuard>
      </InternThemeProvider>
    </>
  );
}
