import AdminShell from "@/components/admin/shell";
import "@/components/admin/admin.css";
import "@olentra/ui/theme/sky-tokens.css";
import "@/components/admin/sky-theme.css";
import "@olentra/ui/theme/dark-presets.css";

export const metadata = {
  title: "Company workspace",
  description: "Olentra company administration workspace.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/dashboard" },
};

export default function DashboardLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
