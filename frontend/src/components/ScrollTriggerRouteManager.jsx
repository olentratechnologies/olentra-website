"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let refreshFrame = 0;
export function requestScrollTriggerRefresh() {
  if (refreshFrame) cancelAnimationFrame(refreshFrame);
  refreshFrame = requestAnimationFrame(() => {
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0;
      ScrollTrigger.refresh(true);
    });
  });
}

export default function ScrollTriggerRouteManager() {
  const pathname = usePathname();
  useEffect(() => {
    let cancelled = false;
    const refresh = () => { if (!cancelled) requestScrollTriggerRefresh(); };
    const timer = window.setTimeout(refresh, 80);
    document.fonts?.ready.then(refresh);
    const images = [...document.images].filter((image) => !image.complete);
    images.forEach((image) => image.addEventListener("load", refresh, { once: true }));
    const observer = new ResizeObserver(refresh);
    document.querySelectorAll("main > section, main > div > section").forEach((node) => observer.observe(node));
    refresh();
    return () => {
      cancelled = true; clearTimeout(timer); observer.disconnect();
      images.forEach((image) => image.removeEventListener("load", refresh));
    };
  }, [pathname]);
  return null;
}
