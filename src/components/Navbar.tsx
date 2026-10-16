"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import AuthModal from "@/components/AuthModal";
import AccountModal from "@/components/AccountModal";
import type { JobApplication } from "@/types/job";

interface NavbarProps {
  jobs?: JobApplication[];
  onMigrateStatus?: (oldStatus: string, newStatus: string) => void | Promise<void>;
}

export default function Navbar({ jobs = [], onMigrateStatus }: NavbarProps) {
  const { user, signOut, isLoading } = useAuth();
  const { theme, setTheme } = useSettings();
  const pathname = usePathname();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountModalTab, setAccountModalTab] = useState<"email" | "password">("email");
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    if (isProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isProfileOpen) {
        setIsProfileOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProfileOpen]);

  const navLinks = [
    { href: "/", label: "Tracker" },
    { href: "/extension", label: "Extension" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <>
      <header className="border-b border-[#30363d] bg-[#161b22] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-2.5 sm:px-8 h-14 flex items-center justify-between gap-1.5 sm:gap-3">
          {/* Left: Brand Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-6 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-1.5 sm:gap-2 select-none hover:opacity-90 transition-opacity"
            >
              <svg
                className="h-5 w-5 sm:h-6 sm:w-6 shrink-0"
                viewBox="0 4 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M24 16V10C24 7.8 25.8 6 28 6H36C38.2 6 40 7.8 40 10V16"
                  stroke="#161b22"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect
                  x="8"
                  y="16"
                  width="48"
                  height="42"
                  rx="7"
                  fill="#96522c"
                  stroke="#161b22"
                  strokeWidth="3.5"
                />
                <path
                  d="M8 23C8 19.1 11.1 16 15 16H49C52.9 16 56 19.1 56 23V36C56 37 55 38 54 38H44L41 42H23L20 38H10C9 38 8 37 8 36V23Z"
                  fill="#b86938"
                  stroke="#161b22"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
                <rect
                  x="18"
                  y="14"
                  width="4"
                  height="8"
                  rx="1.5"
                  fill="#e0a030"
                  stroke="#161b22"
                  strokeWidth="2"
                />
                <rect
                  x="42"
                  y="14"
                  width="4"
                  height="8"
                  rx="1.5"
                  fill="#e0a030"
                  stroke="#161b22"
                  strokeWidth="2"
                />
                <path
                  d="M25 35 H39 C39.8 35 40.5 35.7 40.5 36.5 V38.5 C40.5 39.3 39.8 40 39 40 H34.5 V46.5 C34.5 47.3 33.8 48 33 48 H31 C30.2 48 29.5 47.3 29.5 46.5 V40 H25 C24.2 40 23.5 39.3 23.5 38.5 V36.5 C23.5 35.7 24.2 35 25 35 Z"
                  fill="#e0a030"
                  stroke="#161b22"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-bold text-sm sm:text-base text-[#f0f6fc] tracking-tight leading-none translate-y-px hidden xs:inline">
                JobTrace
              </span>
            </Link>

            {/* Navigation Links: Tracker, Extension, Settings */}
            <nav className="flex items-center gap-0.5 sm:gap-1.5">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-2 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[#21262d] text-[#f0f6fc] border border-[#30363d] shadow-2xs font-semibold"
                        : "text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]/50"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Theme Switch & Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Theme Slider Pill */}
            <div className="theme-slider-track relative flex items-center bg-[#0d1117] p-0.5 rounded-full border border-[#30363d] w-[58px] sm:w-[68px] h-[26px] sm:h-[28px] shadow-inner shrink-0">
              <div
                className={`theme-slider-thumb absolute top-0.5 bottom-0.5 left-0.5 w-[25px] sm:w-[30px] rounded-full bg-white/15 backdrop-blur-md border border-white/20 shadow-xs transition-transform duration-200 ease-out pointer-events-none ${
                  theme === "light" ? "translate-x-[29px] sm:translate-x-[34px]" : "translate-x-0"
                }`}
              />
              <button
                type="button"
                onClick={() => setTheme("dark")}
                title="Dark mode"
                aria-label="Dark mode"
                className={`relative z-10 w-1/2 h-full flex items-center justify-center transition-colors cursor-pointer rounded-full ${
                  theme === "dark" ? "text-amber-300" : "text-[#8b949e] hover:text-[#c9d1d9]"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setTheme("light")}
                title="Light mode"
                aria-label="Light mode"
                className={`relative z-10 w-1/2 h-full flex items-center justify-center transition-colors cursor-pointer rounded-full ${
                  theme === "light" ? "text-amber-500" : "text-[#8b949e] hover:text-[#c9d1d9]"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </button>
            </div>

            {isLoading ? (
              <div className="h-7 w-12 sm:w-16 rounded-md bg-[#21262d] animate-pulse" />
            ) : user ? (
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                  className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2 py-1 rounded-md text-xs font-medium text-[#c9d1d9] hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] transition-colors cursor-pointer select-none"
                  aria-expanded={isProfileOpen}
                  aria-haspopup="true"
                >
                  <span className="w-5 h-5 rounded-full bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/30 flex items-center justify-center font-bold text-[10px] shrink-0 uppercase">
                    {user.email ? user.email[0] : "U"}
                  </span>
                  <span className="hidden md:inline max-w-[140px] truncate text-left">
                    {user.email}
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-[#8b949e] transition-transform duration-150 ${
                      isProfileOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#161b22] border border-[#30363d] shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3.5 py-2.5 border-b border-[#30363d]/80">
                      <p className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider">
                        Signed in as
                      </p>
                      <p className="text-xs font-medium text-[#f0f6fc] truncate mt-0.5">
                        {user.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/settings"
                        onClick={() => setIsProfileOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#c9d1d9] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors cursor-pointer text-left"
                      >
                        <svg className="w-4 h-4 text-[#8b949e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings & Preferences
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          setAccountModalTab("email");
                          setIsAccountModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#c9d1d9] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors cursor-pointer text-left"
                      >
                        <svg className="w-4 h-4 text-[#8b949e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Change Email
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          setAccountModalTab("password");
                          setIsAccountModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#c9d1d9] hover:text-[#f0f6fc] hover:bg-[#21262d] transition-colors cursor-pointer text-left"
                      >
                        <svg className="w-4 h-4 text-[#8b949e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Change Password
                      </button>
                    </div>

                    <div className="border-t border-[#30363d]/80 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-[#f85149] hover:bg-[#da3633]/15 hover:text-[#ff7b72] transition-colors cursor-pointer text-left font-medium"
                      >
                        <svg className="w-4 h-4 text-[#f85149]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-xs font-medium text-[#c9d1d9] hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] px-3 py-1.5 rounded-md transition-colors cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        defaultTab={accountModalTab}
      />
    </>
  );
}
