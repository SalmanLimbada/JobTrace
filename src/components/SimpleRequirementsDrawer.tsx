"use client";

import { useEffect } from "react";
import type { JobApplication } from "@/types/job";

interface SimpleRequirementsDrawerProps {
  job: JobApplication | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SimpleRequirementsDrawer({
  job,
  isOpen,
  onClose,
}: SimpleRequirementsDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !job) return null;

  const requirements = job.keyRequirements || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div className="w-screen max-w-full sm:max-w-md bg-[#0d1117] border-l border-[#30363d] shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#30363d] bg-[#161b22] flex items-center justify-between shrink-0">
            <div className="min-w-0 pr-2">
              <h2 className="text-sm font-semibold text-[#f0f6fc] truncate">
                Key Requirements
              </h2>
              <p className="text-xs text-[#8b949e] truncate mt-0.5">
                <span className="text-[#c9d1d9] font-medium">{job.role}</span> · {job.company}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-md transition-colors cursor-pointer shrink-0"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Body: Simple Box with Key Requirements */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="p-4 rounded-xl border border-[#30363d] bg-[#161b22] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#30363d]/60">
                <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
                  Requirements & Qualifications
                </span>
                <span className="text-[11px] font-mono text-[#8b949e]">
                  {requirements.length} {requirements.length === 1 ? "bullet" : "bullets"}
                </span>
              </div>

              {requirements.length === 0 ? (
                <p className="text-xs text-[#8b949e] py-3 text-center italic">
                  No key requirements extracted for this job yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {requirements.map((req, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-xs text-[#c9d1d9] leading-relaxed"
                    >
                      <span className="text-[#58a6ff] font-bold shrink-0 mt-0.5">•</span>
                      <span className="break-words">{req}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#30363d] bg-[#161b22] flex items-center justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white border border-[#30363d] rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
