import { Suspense } from "react";
import {
  AuthLoading,
  ResetPasswordPage,
} from "@/components/intern/auth/AuthPages";

export const metadata = {
  title: { absolute: "Reset Password | Olentra Technologies Internships" },
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <ResetPasswordPage />
    </Suspense>
  );
}
