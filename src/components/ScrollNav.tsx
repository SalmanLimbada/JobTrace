"use client";

import { useEffect, useState } from "react";

export default function ScrollNav() {
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    let ticking = false;

    function checkScrollable() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const docHeight = Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight
          );
          const scrollable = docHeight > window.innerHeight + 150;
          setIsScrollable(scrollable);
          ticking = false;
        });
        ticking = true;
      }
    }

    checkScrollable();
    window.addEventListener("resize", checkScrollable, { passive: true });
    window.addEventListener("scroll", checkScrollable, { passive: true });

    return () => {
      window.removeEventListener("resize", checkScrollable);
      window.removeEventListener("scroll", checkScrollable);
    };
  }, []);

  if (!isScrollable) return null;

  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  const scrollToBottom = () => {
    const target = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.documentElement.offsetHeight
    );
    try {
      window.scrollTo({ top: target, behavior: "smooth" });
    } catch {
      window.scrollTo(0, target);
    }
  };

  return (
    <aside
      aria-label="Quick scroll navigation"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-3 sm:bottom-6 sm:right-6 z-40 flex flex-col gap-1.5"
    >
      <button
        type="button"
        onClick={scrollToTop}
        title="Jump to top"
        aria-label="Jump to top"
        className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg sm:rounded-md bg-[#161b22]/95 hover:bg-[#21262d] active:bg-[#30363d] border border-[#30363d] hover:border-[#8b949e] text-[#c9d1d9] hover:text-[#f0f6fc] active:scale-95 flex items-center justify-center shadow-xl backdrop-blur-xs transition-all cursor-pointer touch-manipulation select-none group"
      >
        <svg
          className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 15l7-7 7 7"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={scrollToBottom}
        title="Jump to bottom"
        aria-label="Jump to bottom"
        className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg sm:rounded-md bg-[#161b22]/95 hover:bg-[#21262d] active:bg-[#30363d] border border-[#30363d] hover:border-[#8b949e] text-[#c9d1d9] hover:text-[#f0f6fc] active:scale-95 flex items-center justify-center shadow-xl backdrop-blur-xs transition-all cursor-pointer touch-manipulation select-none group"
      >
        <svg
          className="w-4 h-4 group-hover:translate-y-0.5 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
    </aside>
  );
}
