"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTopProgress() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setVisible(scrollTop > 180);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}
      className="fixed bottom-4 right-4 z-[60] w-[32px] h-[32px] md:w-[38px] md:h-[38px] rounded-full bg-gradient-to-br from-blue-500 via-primary to-indigo-500 text-white shadow-[0_10px_20px_rgba(37,99,235,0.35)] ring-1 ring-white/20 inline-flex items-center justify-center opacity-100 pointer-events-auto hover:from-blue-400 hover:via-primary hover:to-indigo-400 transition-colors"
      data-testid="scroll-to-top-progress"
    >
      <ArrowUp className="w-4 h-4" />
    </button>
  );
}
