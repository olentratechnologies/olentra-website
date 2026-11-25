import { Suspense } from "react";
import OffersPage from "@/components/intern/dashboard/OffersPage";

export const metadata = { title: "Offers" };

// The page reads ?schedule= (full-time / part-time) from the URL.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <OffersPage />
    </Suspense>
  );
}
