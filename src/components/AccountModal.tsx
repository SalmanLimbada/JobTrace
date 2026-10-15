"use client";

import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "email" | "password";
}

export default function AccountModal({ isOpen, onClose, defaultTab = "email" }: AccountModalProps) {
  const { user, updateEmail, updatePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<"email" | "password">(defaultTab);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setNewEmail("");
      setNewPassword("");
      setConfirmPassword("");
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen, defaultTab]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const trimmed = newEmail.trim();
    if (!trimmed) {
      setErrorMsg("Please enter a new email address.");
      return;
    }
    if (trimmed.toLowerCase() === user?.email?.toLowerCase()) {
      setErrorMsg("New email must be different from your current email.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await updateEmail(trimmed);
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg("Confirmation email sent! Please check your new inbox to verify.");
        setNewEmail("");
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!newPassword || !confirmPassword) {
      setErrorMsg("Please fill in both password fields.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg("Password updated successfully!");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-xl border border-[#30363d] bg-[#161b22] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363d]">
          <h2 className="text-sm font-semibold text-[#f0f6fc]">
            Account Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#f0f6fc] p-1.5 rounded-md text-xs transition-colors cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-5 border-b border-[#30363d] bg-[#0d1117] gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("email");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "email"
                ? "border-[#58a6ff] text-[#f0f6fc]"
                : "border-transparent text-[#8b949e] hover:text-[#c9d1d9]"
            }`}
          >
            Change Email
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("password");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "password"
                ? "border-[#58a6ff] text-[#f0f6fc]"
                : "border-transparent text-[#8b949e] hover:text-[#c9d1d9]"
            }`}
          >
            Change Password
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="rounded-md bg-[#f85149]/10 border border-[#f85149]/30 px-3 py-2 text-xs text-[#f85149]">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="rounded-md bg-[#2ea043]/10 border border-[#2ea043]/30 px-3 py-2 text-xs text-[#3fb950]">
              {successMsg}
            </div>
          )}

          {activeTab === "email" ? (
            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#8b949e] mb-1">
                  Current Email
                </label>
                <div className="w-full bg-[#0d1117] border border-[#30363d] text-[#8b949e] text-xs rounded-lg px-3 py-2 font-mono">
                  {user?.email || "—"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#c9d1d9] mb-1">
                  New Email Address
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@domain.com"
                  required
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] text-xs rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !newEmail.trim()}
                  className={`w-full py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    isSubmitting || !newEmail.trim()
                      ? "bg-[#21262d] text-[#8b949e] opacity-60 cursor-not-allowed"
                      : "bg-[#238636] hover:bg-[#2ea043] text-white"
                  }`}
                >
                  {isSubmitting ? "Updating..." : "Update Email"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#c9d1d9] mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] text-xs rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#c9d1d9] mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  minLength={6}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] text-xs rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !newPassword || !confirmPassword}
                  className={`w-full py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    isSubmitting || !newPassword || !confirmPassword
                      ? "bg-[#21262d] text-[#8b949e] opacity-60 cursor-not-allowed"
                      : "bg-[#238636] hover:bg-[#2ea043] text-white"
                  }`}
                >
                  {isSubmitting ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
