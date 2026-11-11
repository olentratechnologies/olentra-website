"use client";
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { connectSiteFeatures, getSiteFeatureSnapshot, subscribeSiteFeatures } from "./client.js";
import { effectiveSiteFeatures, isFeatureHrefVisible, siteRouteStatus } from "./rules.mjs";

const Context = createContext(null);
export function SiteFeaturesProvider({ initialState, children }) {
  const state = useSyncExternalStore(subscribeSiteFeatures, getSiteFeatureSnapshot, () => initialState) || initialState;
  useEffect(() => connectSiteFeatures(initialState), [initialState]);
  const value = useMemo(() => ({ state, ready: true, features: effectiveSiteFeatures(state.environments.Production), isVisibleHref: href => isFeatureHrefVisible(href, state.environments.Production) }), [state]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSiteFeatures() {
  const context = useContext(Context); if (!context) throw new Error("Website features need SiteFeaturesProvider."); return context;
}
export function Feature({ name, children }) { const { features } = useSiteFeatures(); return features[name] ? children : null; }
export function SiteFeatureGate({ children }) {
  const pathname = usePathname(), { state } = useSiteFeatures();
  const status = siteRouteStatus(pathname, state.environments.Production);
  if (status === 200) return children;
  return <main className="min-h-screen bg-[#070b12] text-white flex items-center justify-center px-6"><div className="max-w-lg text-center"><p className="text-sm text-slate-400 mb-4">OLENTRA TECHNOLOGIES</p><h1 className="text-4xl font-bold mb-5">{status === 503 ? "We’ll be back soon" : "Page not found"}</h1><p className="text-slate-400 mb-7">{status === 503 ? "Our website is temporarily undergoing maintenance." : "This page is currently unavailable."}</p>{status !== 503 && <Link href="/" className="inline-block rounded-full bg-blue-600 px-6 py-3">Back to home</Link>}</div></main>;
}
