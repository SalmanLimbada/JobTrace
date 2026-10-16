"use client";

import { useState, useMemo } from "react";
import type { JobApplication } from "@/types/job";

interface CleanUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: JobApplication[];
  onDeleteJobs?: (ids: string[]) => void;
  onDeleteJob: (id: string) => void;
  statuses: string[];
}

export default function CleanUpModal({
  isOpen,
  onClose,
  jobs,
  onDeleteJobs,
  onDeleteJob,
  statuses,
}: CleanUpModalProps) {
  const [cleanupType, setCleanupType] = useState<"status" | "age" | "oldest">("status");
  const [selectedStatus, setSelectedStatus] = useState<string>("Rejected");
  const [selectedDays, setSelectedDays] = useState<number>(90);
  const [selectedCount, setSelectedCount] = useState<number>(25);

  const matchingJobs = useMemo(() => {
    const now = Date.now();

    if (cleanupType === "status") {
      return jobs.filter((j) => j.status.toLowerCase() === selectedStatus.toLowerCase());
    }

    if (cleanupType === "age") {
      return jobs.filter((j) => {
        if (!j.appliedDate) return true; // Undated treated as older
        const d = new Date(j.appliedDate.split("T")[0]).getTime();
        if (isNaN(d)) return false;
        const diffDays = (now - d) / (1000 * 60 * 60 * 24);
        return diffDays >= selectedDays;
      });
    }

    if (cleanupType === "oldest") {
      // Sort ascending by appliedDate so oldest come first
      const sorted = [...jobs].sort((a, b) => {
        const dateA = a.appliedDate || "";
        const dateB = b.appliedDate || "";
        return dateA.localeCompare(dateB);
      });
      return sorted.slice(0, selectedCount);
    }

    return [];
  }, [jobs, cleanupType, selectedStatus, selectedDays, selectedCount]);

  if (!isOpen) return null;

  function handleConfirmDelete() {
    if (matchingJobs.length === 0) return;
    const count = matchingJobs.length;
    if (
      !confirm(
        `Are you sure you want to permanently delete ${count} application${count > 1 ? "s" : ""}? This cannot be undone.`
      )
    ) {
      return;
    }

    const idsToDelete = matchingJobs.map((j) => j.id);
    if (onDeleteJobs) {
      onDeleteJobs(idsToDelete);
    } else {
      idsToDelete.forEach((id) => onDeleteJob(id));
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-[#30363d] bg-[#161b22] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#f0f6fc]">
                Clean Up Applications
              </h2>
              <p className="text-xs text-[#8b949e]">
                Bulk delete stale or inactive applications
              </p>
            </div>
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

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Cleanup Criteria Mode */}
          <div>
            <label className="block text-[#8b949e] text-[11px] font-medium mb-2">
              Select criteria
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0d1117] border border-[#30363d] rounded-lg">
              <button
                type="button"
                onClick={() => setCleanupType("status")}
                className={`py-1.5 px-2 rounded-md font-medium transition-colors cursor-pointer text-center ${
                  cleanupType === "status"
                    ? "bg-[#21262d] text-[#f0f6fc] shadow-xs"
                    : "text-[#8b949e] hover:text-[#c9d1d9]"
                }`}
              >
                By Status
              </button>
              <button
                type="button"
                onClick={() => setCleanupType("age")}
                className={`py-1.5 px-2 rounded-md font-medium transition-colors cursor-pointer text-center ${
                  cleanupType === "age"
                    ? "bg-[#21262d] text-[#f0f6fc] shadow-xs"
                    : "text-[#8b949e] hover:text-[#c9d1d9]"
                }`}
              >
                By Date
              </button>
              <button
                type="button"
                onClick={() => setCleanupType("oldest")}
                className={`py-1.5 px-2 rounded-md font-medium transition-colors cursor-pointer text-center ${
                  cleanupType === "oldest"
                    ? "bg-[#21262d] text-[#f0f6fc] shadow-xs"
                    : "text-[#8b949e] hover:text-[#c9d1d9]"
                }`}
              >
                By Count
              </button>
            </div>
          </div>

          {/* Type-Specific Controls */}
          {cleanupType === "status" && (
            <div>
              <label className="block text-[#8b949e] text-[11px] font-medium mb-1.5">
                Delete all applications with status:
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] text-xs rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] cursor-pointer"
              >
                {Array.from(new Set([...statuses, "Rejected", "Withdrawn", "Other"])).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {cleanupType === "age" && (
            <div>
              <label className="block text-[#8b949e] text-[11px] font-medium mb-1.5">
                Delete applications older than:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[30, 60, 90, 180].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setSelectedDays(days)}
                    className={`py-2 px-1 text-center rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                      selectedDays === days
                        ? "border-[#58a6ff] bg-[#58a6ff]/10 text-[#58a6ff] font-semibold"
                        : "border-[#30363d] bg-[#0d1117] text-[#c9d1d9] hover:bg-[#21262d]"
                    }`}
                  >
                    {days} days
                  </button>
                ))}
              </div>
            </div>
          )}

          {cleanupType === "oldest" && (
            <div>
              <label className="block text-[#8b949e] text-[11px] font-medium mb-1.5">
                Delete the oldest:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 25, 50, 100].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setSelectedCount(cnt)}
                    className={`py-2 px-1 text-center rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                      selectedCount === cnt
                        ? "border-[#58a6ff] bg-[#58a6ff]/10 text-[#58a6ff] font-semibold"
                        : "border-[#30363d] bg-[#0d1117] text-[#c9d1d9] hover:bg-[#21262d]"
                    }`}
                  >
                    {cnt} jobs
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matching Count Preview Card */}
          <div className="p-3.5 rounded-lg border border-[#30363d] bg-[#0d1117] flex items-center justify-between">
            <span className="text-[#8b949e]">Applications to be deleted:</span>
            <span
              className={`font-mono font-bold text-sm ${
                matchingJobs.length > 0 ? "text-red-400" : "text-[#8b949e]"
              }`}
            >
              {matchingJobs.length}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-[#30363d] bg-[#161b22]">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#8b949e] hover:text-[#f0f6fc] px-3 py-1.5 rounded-md hover:bg-[#21262d] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={matchingJobs.length === 0}
            onClick={handleConfirmDelete}
            className="text-xs font-medium text-white bg-[#da3633] hover:bg-[#b62324] disabled:opacity-40 disabled:hover:bg-[#da3633] px-4 py-1.5 rounded-md transition-colors cursor-pointer shadow-xs"
          >
            Delete {matchingJobs.length > 0 ? matchingJobs.length : ""} Application{matchingJobs.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}
