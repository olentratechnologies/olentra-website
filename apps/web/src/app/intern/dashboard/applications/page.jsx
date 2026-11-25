import { Suspense } from "react";
import ApplicationsPage from "@/components/intern/dashboard/ApplicationsPage";

export const metadata = { title: "Applications" };

// The page reads ?schedule= (full-time / part-time) from the URL.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ApplicationsPage />
    </Suspense>
  );
}
