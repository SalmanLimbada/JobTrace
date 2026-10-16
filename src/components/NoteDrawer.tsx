"use client";

import { useEffect, useState } from "react";

export interface NoteDrawerItem {
  title: string;
  company: string;
  role: string;
  content: string;
  jobId: string;
}

interface NoteDrawerProps {
  item: NoteDrawerItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (jobId: string) => void;
}

export default function NoteDrawer({
  item,
  isOpen,
  onClose,
  onEdit,
}: NoteDrawerProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

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
                {item.title}
              </h2>
              <p className="text-xs text-[#8b949e] truncate mt-0.5">
                <span className="text-[#c9d1d9] font-medium">{item.role}</span> · {item.company}
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

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="p-4 rounded-xl border border-[#30363d] bg-[#161b22] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#30363d]/60">
                <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
                  Full Details
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-[11px] text-[#58a6ff] hover:underline cursor-pointer flex items-center gap-1 font-medium"
                >
                  {copied ? (
                    <span className="text-emerald-400">Copied!</span>
                  ) : (
                    <span>Copy text</span>
                  )}
                </button>
              </div>

              <div className="whitespace-pre-wrap break-words text-xs sm:text-sm text-[#f0f6fc] leading-relaxed font-sans selection:bg-[#58a6ff]/30">
                {item.content}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#30363d] bg-[#161b22] flex items-center justify-between shrink-0">
            {onEdit ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(item.jobId);
                }}
                className="px-3 py-1.5 text-xs font-medium text-[#58a6ff] hover:bg-[#58a6ff]/10 border border-[#58a6ff]/30 rounded-lg transition-colors cursor-pointer"
              >
                Edit Application
              </button>
            ) : <div />}

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
