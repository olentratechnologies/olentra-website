import AdminShell from "@/components/admin/shell";
import { ADMIN_THEME_BOOTSTRAP } from "@/lib/admin/theme.mjs";
import "@/components/admin/admin.css";
import "@/components/theme/sky-tokens.css";
import "@/components/admin/sky-theme.css";

export const metadata = {
  title: "Company workspace",
  description: "Olentra company administration workspace.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/dashboard" },
};

export default function DashboardLayout({ children }) {
  return <><script dangerouslySetInnerHTML={{ __html: ADMIN_THEME_BOOTSTRAP }} /><AdminShell>{children}</AdminShell></>;
}
