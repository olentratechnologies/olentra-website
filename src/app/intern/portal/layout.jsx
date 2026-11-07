import { RoleGuard } from "@/components/intern/InternshipProvider";
import PortalShell from "@/components/intern/portal/PortalShell";

export const metadata = {
  title: {
    default: "My Internship",
    template: "%s | Olentra Technologies Internships",
  },
  robots: { index: false, follow: false },
};

export default function InternPortalLayout({ children }) {
  return (
    <RoleGuard role="intern">
      <PortalShell>{children}</PortalShell>
    </RoleGuard>
  );
}
