"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
const enabledByDefault =
  process.env.NEXT_PUBLIC_SMOOTH_SCROLL_ENABLED !== "false";
const excludedRoutes = ["/products/dailysupply/showcase"];

function TickerBridge() {
  const lenis = useLenis();
  const ticker = useRef(null);
  useEffect(() => {
    if (!lenis) return;
    const scroll = () => ScrollTrigger.update();
    ticker.current = (time) => lenis.raf(time * 1000);
    lenis.on("scroll", scroll);
    gsap.ticker.add(ticker.current);
    // Do not disable GSAP lag smoothing: other site scenes own GSAP timing too.
    return () => {
      lenis.off("scroll", scroll);
      if (ticker.current) gsap.ticker.remove(ticker.current);
      ticker.current = null;
    };
  }, [lenis]);

  return null;
}

export default function SmoothScrollProvider({ children }) {
  const pathname = usePathname();
  const sessionDisabled =
    typeof window !== "undefined" &&
    window.sessionStorage?.getItem("olentra-native-scroll") === "1";
  if (
    !enabledByDefault ||
    sessionDisabled ||
    excludedRoutes.includes(pathname) ||
    (pathname.startsWith("/intern/") && pathname !== "/intern/")
  )
    return children;
  return (
    <ReactLenis
      root
      options={{
        autoRaf: false,
        lerp: 0.09,
        smoothWheel: true,
        syncTouch: false,
        touchMultiplier: 1,
        respectReducedMotion: true,
        stopInertiaOnNavigate: true,
        anchors: {
          duration: 1.2,
          easing: (t) => 1 - Math.pow(1 - t, 3),
          offset: 0,
        },
      }}
    >
      <TickerBridge />
      {children}
    </ReactLenis>
  );
}
