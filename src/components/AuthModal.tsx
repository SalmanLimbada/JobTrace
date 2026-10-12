"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg("Account created! Check your email to confirm or sign in.");
          setEmail("");
          setPassword("");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMsg(error.message);
        } else {
          onClose();
        }
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-xl border border-[#30363d] bg-[#161b22] p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#30363d] mb-5">
          <h2 className="text-sm font-semibold text-[#f0f6fc]">
            {isSignUp ? "Create your account" : "Sign in to Job Tracker"}
          </h2>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#f0f6fc] p-1 rounded-md text-xs transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-md bg-[#f85149]/10 border border-[#f85149]/30 px-3 py-2 text-xs text-[#f85149]">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 rounded-md bg-[#2ea043]/10 border border-[#2ea043]/30 px-3 py-2 text-xs text-[#3fb950]">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="block text-xs font-medium text-[#c9d1d9] mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              required
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-xs text-[#c9d1d9] placeholder-[#484f58] focus:border-[#58a6ff] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#c9d1d9] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-xs text-[#c9d1d9] placeholder-[#484f58] focus:border-[#58a6ff] focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-md bg-[#238636] hover:bg-[#2ea043] text-white py-2 text-xs font-medium border border-[#2ea043]/50 transition-colors disabled:opacity-50"
          >
            {isSubmitting
              ? "Connecting..."
              : isSignUp
              ? "Create Account"
              : "Sign In"}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-[#30363d] text-center text-xs text-[#8b949e]">
          {isSignUp ? "Already have an account? " : "New user? "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className="text-[#58a6ff] hover:underline font-medium"
          >
            {isSignUp ? "Sign In" : "Create an account"}
          </button>
        </div>
      </div>
    </div>
  );
}
