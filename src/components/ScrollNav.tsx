"use client";

import { useEffect, useState } from "react";

export default function ScrollNav() {
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    function checkScrollable() {
      const scrollable =
        document.documentElement.scrollHeight > window.innerHeight + 250;
      setIsScrollable(scrollable);
    }

    checkScrollable();
    window.addEventListener("resize", checkScrollable);
    window.addEventListener("scroll", checkScrollable, { passive: true });

    // Also observe DOM changes (e.g. when jobs load or table expands)
    const observer = new MutationObserver(checkScrollable);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("resize", checkScrollable);
      window.removeEventListener("scroll", checkScrollable);
      observer.disconnect();
    };
  }, []);

  if (!isScrollable) return null;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  };

  return (
    <aside
      aria-label="Quick scroll navigation"
      className="fixed bottom-6 right-6 z-40 flex flex-col gap-1.5"
    >
      <button
        type="button"
        onClick={scrollToTop}
        title="Jump to top"
        aria-label="Jump to top"
        className="w-8 h-8 rounded-md bg-[#161b22]/90 hover:bg-[#21262d] border border-[#30363d] hover:border-[#8b949e] text-[#c9d1d9] hover:text-[#f0f6fc] flex items-center justify-center shadow-xl backdrop-blur-xs transition-all cursor-pointer group"
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
        className="w-8 h-8 rounded-md bg-[#161b22]/90 hover:bg-[#21262d] border border-[#30363d] hover:border-[#8b949e] text-[#c9d1d9] hover:text-[#f0f6fc] flex items-center justify-center shadow-xl backdrop-blur-xs transition-all cursor-pointer group"
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
