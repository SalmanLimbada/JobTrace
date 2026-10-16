"use client";

import { useEffect, useState } from "react";

export default function ScrollNav() {
  const [scrollY, setScrollY] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);

  useEffect(() => {
    let ticking = false;

    function handleScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const sy = window.scrollY || document.documentElement.scrollTop;
          const docHeight = Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight,
            document.documentElement.offsetHeight
          );
          const winHeight = window.innerHeight;
          const ms = Math.max(0, docHeight - winHeight);

          setScrollY(sy);
          setMaxScroll(ms);
          ticking = false;
        });
        ticking = true;
      }
    }

    handleScroll();
    window.addEventListener("resize", handleScroll, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", handleScroll);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Only show navigation when page content is scrollable
  if (maxScroll < 120) return null;

  const atTop = scrollY <= 40;
  const atBottom = maxScroll - scrollY <= 40;

  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  const stepUp = () => {
    const step = Math.max(280, Math.round(window.innerHeight * 0.7));
    try {
      window.scrollBy({ top: -step, behavior: "smooth" });
    } catch {
      window.scrollBy(0, -step);
    }
  };

  const stepDown = () => {
    const step = Math.max(280, Math.round(window.innerHeight * 0.7));
    try {
      window.scrollBy({ top: step, behavior: "smooth" });
    } catch {
      window.scrollBy(0, step);
    }
  };

  const scrollToBottom = () => {
    window.dispatchEvent(new CustomEvent("jobtrace_load_all_records"));
    setTimeout(() => {
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
    }, 60);
  };

  return (
    <aside
      aria-label="Quick scroll navigation"
      className="scroll-nav-dock fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-3 sm:bottom-6 sm:right-6 z-40 flex flex-col bg-[#161b22]/95 border border-[#30363d] rounded-lg shadow-2xl backdrop-blur-md overflow-hidden divide-y divide-[#30363d]/60 select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* 1. All the way to top */}
      <button
        type="button"
        onClick={scrollToTop}
        disabled={atTop}
        title="Jump all the way to top"
        aria-label="Jump all the way to top"
        className="scroll-nav-btn w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-[#c9d1d9] hover:text-[#f0f6fc] hover:bg-[#21262d] active:bg-[#30363d] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors cursor-pointer touch-manipulation"
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5h14" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* 2. Scroll up (little by little) */}
      <button
        type="button"
        onClick={stepUp}
        onDoubleClick={scrollToTop}
        disabled={atTop}
        title="Scroll up (little by little) · Double-click for top"
        aria-label="Scroll up"
        className="scroll-nav-btn w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-[#c9d1d9] hover:text-[#f0f6fc] hover:bg-[#21262d] active:bg-[#30363d] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors cursor-pointer touch-manipulation"
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* 3. Scroll down (little by little) */}
      <button
        type="button"
        onClick={stepDown}
        onDoubleClick={scrollToBottom}
        disabled={atBottom}
        title="Scroll down (little by little) · Double-click for bottom"
        aria-label="Scroll down"
        className="scroll-nav-btn w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-[#c9d1d9] hover:text-[#f0f6fc] hover:bg-[#21262d] active:bg-[#30363d] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors cursor-pointer touch-manipulation"
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 4. All the way to bottom */}
      <button
        type="button"
        onClick={scrollToBottom}
        disabled={atBottom}
        title="Jump all the way to bottom"
        aria-label="Jump all the way to bottom"
        className="scroll-nav-btn w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-[#c9d1d9] hover:text-[#f0f6fc] hover:bg-[#21262d] active:bg-[#30363d] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors cursor-pointer touch-manipulation"
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 19h14" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </aside>
  );
}
