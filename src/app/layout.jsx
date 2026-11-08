import "./globals.css";
import { Manrope, Inter } from "next/font/google";
import Script from "next/script";
import Providers from "./providers";
import Loader from "../components/Loader";
import DailySupplyWelcome from "../components/welcome/DailySupplyWelcome";
import VisitorTracker from "@/components/realtime/VisitorTracker";
import { companyInfo } from "@/data/company";
import { siteConfig } from "@/lib/site";
import "lenis/dist/lenis.css";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import ScrollTriggerRouteManager from "@/components/ScrollTriggerRouteManager";
import { SiteFeaturesProvider, SiteFeatureGate } from "@/components/site-features";
import { readSiteFeatures, publicSiteFeatureState } from "@/lib/server/site-features.mjs";

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
        <Script id="performance-server-timing-fix" strategy="beforeInteractive">
          {`window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);`}
        </Script>

        <Script id="posthog" strategy="lazyOnload">
          {`(function(){var CONSENT_KEY="olentra_cookie_consent_v1";var started=false;function boot(){if(started)return;started=true;!(function(t,e){var o,n,p,r;e.__SV||((window.posthog=e),(e._i=[]),(e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&((t=t[o[0]]),(e=o[1])),(t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))});}((p=t.createElement("script")).type="text/javascript"),(p.crossOrigin="anonymous"),(p.async=!0),(p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js"),(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?(u=e[a]=[]):(a="posthog"),u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init me ws ys ps bs capture je Di ks register register_once register_for_session unregister unregister_for_session Ps getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey canRenderSurveyAsync identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty Es $s createPersonProfile Is opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing Ss debug xs getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])}),(e.__SV=1))})(document,window.posthog||[]);posthog.init("phc_xAvL2Iq4tFmANRE7kzbKwaSqp1HJjN7x48s3vr0CMjs",{api_host:"https://us.i.posthog.com",person_profiles:"identified_only",session_recording:{recordCrossOriginIframes:!0,capturePerformance:!1}});}function hasConsent(){try{var raw=window.localStorage.getItem(CONSENT_KEY);if(!raw)return false;var parsed=JSON.parse(raw);return Boolean(parsed&&parsed.analytics);}catch(_){return false;}}if(hasConsent())boot();window.addEventListener("olentra-consent-changed",function(event){if(event&&event.detail&&event.detail.analytics){boot();}});window.__olentraInitPosthog=boot;})();`}
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
