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
            <svg
              className="h-6 w-6 shrink-0"
              viewBox="0 0 64 64"
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
            <span className="font-bold text-base text-[#f0f6fc] tracking-tight">
              JobTrace
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
