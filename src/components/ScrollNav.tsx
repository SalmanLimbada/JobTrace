"use client";

import { useEffect, useState } from "react";

export default function ScrollNav() {
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);

  useEffect(() => {
    let ticking = false;

    function handleScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY || document.documentElement.scrollTop;
          const docHeight = Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight
          );
          const winHeight = window.innerHeight;
          const maxScroll = docHeight - winHeight;

          // Only show 'jump to top' once scrolled down significantly
          setShowTop(scrollY > 300);

          // On desktop, show 'jump to bottom' only when there is substantial content below
          setShowBottom(maxScroll - scrollY > 350 && maxScroll > 400);

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

  if (!showTop && !showBottom) return null;

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
      {showTop && (
        <button
          type="button"
          onClick={scrollToTop}
          title="Jump to top"
          aria-label="Jump to top"
          className="w-9 h-9 sm:w-8 sm:h-8 rounded-full sm:rounded-md bg-[#161b22]/95 hover:bg-[#21262d] active:bg-[#30363d] border border-[#30363d] hover:border-[#8b949e] text-[#c9d1d9] hover:text-[#f0f6fc] active:scale-95 flex items-center justify-center shadow-xl backdrop-blur-md transition-all cursor-pointer touch-manipulation select-none animate-in fade-in zoom-in-95 duration-150"
        >
          <svg
            className="w-4 h-4"
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
      )}

      {showBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          title="Jump to bottom"
          aria-label="Jump to bottom"
          className="hidden sm:flex w-8 h-8 rounded-md bg-[#161b22]/95 hover:bg-[#21262d] active:bg-[#30363d] border border-[#30363d] hover:border-[#8b949e] text-[#c9d1d9] hover:text-[#f0f6fc] active:scale-95 items-center justify-center shadow-xl backdrop-blur-md transition-all cursor-pointer select-none animate-in fade-in zoom-in-95 duration-150"
        >
          <svg
            className="w-4 h-4"
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
      )}
    </aside>
  );
}
