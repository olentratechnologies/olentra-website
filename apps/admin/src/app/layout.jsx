import "@olentra/ui/styles/globals.css";
import { Manrope, Inter } from "next/font/google";
import Script from "next/script";
import Providers from "./providers";
import VisitorTracker from "@olentra/realtime/VisitorTracker";
import { SiteFeaturesProvider } from "@olentra/site-features/react";
import { readSiteFeatures, publicSiteFeatureState } from "@olentra/site-features/server/store";
import { PERFORMANCE_SERVER_TIMING_FIX, POSTHOG_BOOTSTRAP } from "@olentra/ui/document-scripts";
import { WORKSPACE_THEME_BOOTSTRAP } from "@olentra/ui/theme/workspace-theme-bootstrap.mjs";

export const dynamic = "force-dynamic";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

// Matches what the company workspace inherited from the website layout before
// the apps were split: same document scripts, fonts, theme and feature state.
export const metadata = {
  title: { default: "Company workspace", template: "%s | Olentra Technologies" },
  applicationName: "Olentra Technologies",
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
    apple: "/apple-icon.png",
    shortcut: "/icon.png",
  },
};

export const viewport = { themeColor: "#000000" };

export default async function RootLayout({ children }) {
  const featureState = publicSiteFeatureState(await readSiteFeatures());
  return (
    <html lang="en" className={`relative dark ${manrope.variable} ${inter.variable}`} suppressHydrationWarning>
      <head></head>
      <body className="relative min-h-screen bg-background">
        <Script id="workspace-theme-bootstrap" strategy="beforeInteractive">{WORKSPACE_THEME_BOOTSTRAP}</Script>
        <Script id="performance-server-timing-fix" strategy="beforeInteractive">{PERFORMANCE_SERVER_TIMING_FIX}</Script>
        <Script id="posthog" strategy="lazyOnload">{POSTHOG_BOOTSTRAP}</Script>
        <SiteFeaturesProvider initialState={featureState}><Providers>{children}<VisitorTracker /></Providers></SiteFeaturesProvider>
      </body>
    </html>
  );
}
