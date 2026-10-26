"use client";

import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "email" | "password";
}

export default function AccountModal({
  isOpen,
  onClose,
  defaultTab = "email",
}: AccountModalProps) {
  const { user, updateEmail, updatePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<"email" | "password">(defaultTab);

  // Email form state
  const [newEmail, setNewEmail] = useState("");
  const [confirmNewEmail, setConfirmNewEmail] = useState("");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");

  // Password form state
  const [pwdCurrentPassword, setPwdCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setNewEmail("");
      setConfirmNewEmail("");
      setEmailCurrentPassword("");
      setPwdCurrentPassword("");
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

    const trimmedNew = newEmail.trim().toLowerCase();
    const trimmedConfirm = confirmNewEmail.trim().toLowerCase();

    if (!trimmedNew) {
      setErrorMsg("Please enter a new email address.");
      return;
    }
    if (trimmedNew !== trimmedConfirm) {
      setErrorMsg("Emails do not match. Please verify your new email.");
      return;
    }
    if (trimmedNew === user?.email?.toLowerCase()) {
      setErrorMsg("New email must be different from your current email.");
      return;
    }
    if (!emailCurrentPassword) {
      setErrorMsg("Please enter your current password to confirm.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Verify current password before modifying sensitive account credentials
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: emailCurrentPassword,
      });

      if (authError) {
        setErrorMsg("Incorrect current password. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // 2. Request email update with verification requirement
      const { error } = await updateEmail(trimmedNew);
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg(
          "Confirmation link sent! Please check your new inbox to complete the change."
        );
        setNewEmail("");
        setConfirmNewEmail("");
        setEmailCurrentPassword("");
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

    if (!pwdCurrentPassword) {
      setErrorMsg("Please enter your current password.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      setErrorMsg("Please fill in both new password fields.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }
    if (newPassword === pwdCurrentPassword) {
      setErrorMsg("New password must be different from your current password.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Verify current password before allowing password change
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: pwdCurrentPassword,
      });

      if (authError) {
        setErrorMsg("Incorrect current password. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // 2. Update password
      const { error } = await updatePassword(newPassword);
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg("Password updated successfully!");
        setPwdCurrentPassword("");
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-xl border border-[#30363d] bg-[#161b22] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-[#58a6ff]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <h2 className="text-sm font-semibold text-[#f0f6fc]">
              Account Settings
            </h2>
          </div>
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
            <div className="rounded-lg bg-[#f85149]/10 border border-[#f85149]/30 px-3 py-2.5 text-xs text-[#f85149]">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="rounded-lg bg-[#2ea043]/10 border border-[#2ea043]/30 px-3 py-2.5 text-xs text-[#3fb950]">
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
                  New Email Address *
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

              <div>
                <label className="block text-xs font-medium text-[#c9d1d9] mb-1">
                  Confirm New Email *
                </label>
                <input
                  type="email"
                  value={confirmNewEmail}
                  onChange={(e) => setConfirmNewEmail(e.target.value)}
                  placeholder="Re-enter new email address"
                  required
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] text-xs rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] transition-colors"
                />
              </div>

              <div className="pt-1">
                <label className="block text-xs font-medium text-[#c9d1d9] mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  value={emailCurrentPassword}
                  onChange={(e) => setEmailCurrentPassword(e.target.value)}
                  placeholder="Verify your identity"
                  required
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] text-xs rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] transition-colors"
                />
                <span className="block text-[11px] text-[#8b949e] mt-1">
                  Required to prevent unauthorized email changes.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !newEmail.trim() ||
                    !confirmNewEmail.trim() ||
                    !emailCurrentPassword
                  }
                  className={`w-full py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    isSubmitting ||
                    !newEmail.trim() ||
                    !confirmNewEmail.trim() ||
                    !emailCurrentPassword
                      ? "bg-[#21262d] text-[#8b949e] opacity-60 cursor-not-allowed"
                      : "bg-[#238636] hover:bg-[#2ea043] text-white shadow-sm"
                  }`}
                >
                  {isSubmitting ? "Verifying..." : "Update Email"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#c9d1d9] mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  value={pwdCurrentPassword}
                  onChange={(e) => setPwdCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] text-xs rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#c9d1d9] mb-1">
                  New Password *
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
                  Confirm New Password *
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
                  disabled={
                    isSubmitting ||
                    !pwdCurrentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                  className={`w-full py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    isSubmitting ||
                    !pwdCurrentPassword ||
                    !newPassword ||
                    !confirmPassword
                      ? "bg-[#21262d] text-[#8b949e] opacity-60 cursor-not-allowed"
                      : "bg-[#238636] hover:bg-[#2ea043] text-white shadow-sm"
                  }`}
                >
                  {isSubmitting ? "Verifying..." : "Update Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
