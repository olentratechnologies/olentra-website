import { Suspense } from "react";
import { INTERN_THEME_BOOTSTRAP } from "@/lib/intern/theme.mjs";
import { AuthLoading, RegisterPage } from "@/components/intern/auth/AuthPages";

export const metadata = {
  title: { absolute: "Create Account | Olentra Technologies Internships" },
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: INTERN_THEME_BOOTSTRAP }} />
      <Suspense fallback={<AuthLoading />}>
        <RegisterPage />
      </Suspense>
    </>
  );
}
