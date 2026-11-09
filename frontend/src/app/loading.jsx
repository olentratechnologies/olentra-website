"use client";

import Loader from "@/components/Loader";

/**
 * Root Loading component for Next.js App Router.
 * This handles transitions between pages.
 */
export default function Loading() {
    return <Loader isInitialLoad={false} />;
}
