import { Suspense } from "react";
import { AuthLoading, RegisterPage } from "@/components/intern/auth/AuthPages";

export const metadata = {
  title: { absolute: "Create Account | Olentra Technologies Internships" },
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <RegisterPage />
    </Suspense>
  );
}
