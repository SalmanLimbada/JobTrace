"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";

export default function Navbar() {
  const { user, signOut, isLoading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <header className="border-b border-[#30363d] bg-[#161b22] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-sm text-[#f0f6fc] tracking-tight">
              Job Application Tracker
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="h-7 w-16 rounded-md bg-[#21262d] animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-[#8b949e] bg-[#21262d] border border-[#30363d] px-2.5 py-1 rounded-md hidden sm:inline-block">
                  {user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-xs font-medium text-[#c9d1d9] hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] px-3 py-1.5 rounded-md transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-xs font-medium text-[#c9d1d9] hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] px-3 py-1.5 rounded-md transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
