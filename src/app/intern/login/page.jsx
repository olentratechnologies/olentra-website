import { Suspense } from "react";
import { AuthLoading, LoginPage } from "@/components/intern/auth/AuthPages";

export const metadata = {
  title: { absolute: "Sign In | Olentra Technologies Internships" },
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <>
      <link
        rel="preload"
        href="/images/intern/login-campus-unbranded.webp"
        as="image"
        fetchPriority="high"
      />
      <Suspense fallback={<AuthLoading />}>
        <LoginPage />
      </Suspense>
    </>
  );
}
