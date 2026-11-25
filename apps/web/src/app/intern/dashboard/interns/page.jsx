import { Suspense } from "react";
import InternsPage from "@/components/intern/dashboard/InternsPage";

export const metadata = { title: "Interns" };

// The page reads ?schedule= (full-time / part-time) from the URL.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <InternsPage />
    </Suspense>
  );
}
