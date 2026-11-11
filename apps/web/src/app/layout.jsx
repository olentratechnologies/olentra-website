import "@olentra/ui/styles/globals.css";
import { Manrope, Inter } from "next/font/google";
import Script from "next/script";
import Providers from "./providers";
import Loader from "../components/Loader";
import DailySupplyWelcome from "../components/welcome/DailySupplyWelcome";
import VisitorTracker from "@olentra/realtime/VisitorTracker";
import { companyInfo } from "@/data/company";
import { siteConfig } from "@/lib/site";
import "lenis/dist/lenis.css";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import ScrollTriggerRouteManager from "@/components/ScrollTriggerRouteManager";
import { SiteFeaturesProvider, SiteFeatureGate } from "@olentra/site-features/react";
import { readSiteFeatures, publicSiteFeatureState } from "@olentra/site-features/server/store";
import { PERFORMANCE_SERVER_TIMING_FIX, POSTHOG_BOOTSTRAP } from "@olentra/ui/document-scripts";
import { WORKSPACE_THEME_BOOTSTRAP } from "@olentra/ui/theme/workspace-theme-bootstrap.mjs";

export const dynamic = "force-dynamic";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.defaultTitle,
    template: siteConfig.titleTemplate,
  },
  description: siteConfig.description,
  applicationName: companyInfo.name,
  keywords: [
    "enterprise software engineering",
    "AI product development",
    "platform engineering",
    "cloud architecture",
    "digital product agency",
    "enterprise web development",
  ],
  authors: [{ name: companyInfo.name }],
  creator: companyInfo.name,
  publisher: companyInfo.name,
  category: "technology",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: companyInfo.name,
    locale: siteConfig.locale,
    type: "website",
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: companyInfo.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
    apple: "/apple-icon.png",
    shortcut: "/icon.png",
  },
};

export const viewport = {
  themeColor: "#000000",
};

export default async function RootLayout({ children }) {
  const featureState = publicSiteFeatureState(await readSiteFeatures());
  return (
    <html
      lang="en"
      className={`relative dark ${manrope.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head></head>
      <body className="relative min-h-screen bg-background">
        <Script id="workspace-theme-bootstrap" strategy="beforeInteractive">
          {WORKSPACE_THEME_BOOTSTRAP}
        </Script>
        <Script id="performance-server-timing-fix" strategy="beforeInteractive">
          {PERFORMANCE_SERVER_TIMING_FIX}
        </Script>

        <Script id="posthog" strategy="lazyOnload">
          {POSTHOG_BOOTSTRAP}
        </Script>

        <SiteFeaturesProvider initialState={featureState}><Providers><SiteFeatureGate><SmoothScrollProvider><ScrollTriggerRouteManager />{children}</SmoothScrollProvider>
        <Loader isInitialLoad={true} />
        <DailySupplyWelcome />
        <VisitorTracker />
        </SiteFeatureGate></Providers></SiteFeaturesProvider>
      </body>
    </html>
  );
}
