import { RoleGuard } from "@/components/intern/InternshipProvider";
import PortalShell from "@/components/intern/portal/PortalShell";
import { InternThemeProvider } from "@/components/intern/InternTheme";
import { INTERN_THEME_BOOTSTRAP } from "@/lib/intern/theme.mjs";

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
      <script dangerouslySetInnerHTML={{ __html: INTERN_THEME_BOOTSTRAP }} />
      <InternThemeProvider>
        <RoleGuard role="intern">
          <PortalShell>{children}</PortalShell>
        </RoleGuard>
      </InternThemeProvider>
    </>
  );
}
