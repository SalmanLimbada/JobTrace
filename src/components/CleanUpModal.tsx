"use client";

import { useState, useMemo } from "react";
import type { JobApplication } from "@/types/job";
import ConfirmModal from "@/components/ConfirmModal";

interface CleanUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: JobApplication[];
  onDeleteJobs?: (ids: string[], isAll?: boolean) => Promise<void> | void;
  onDeleteJob: (id: string) => Promise<void> | void;
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
  const [cleanupType, setCleanupType] = useState<"all" | "duplicates" | "status" | "age" | "oldest">("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("Rejected");
  const [selectedDays, setSelectedDays] = useState<number>(90);
  const [isCustomDays, setIsCustomDays] = useState<boolean>(false);
  const [customDaysInput, setCustomDaysInput] = useState<string>("");

  const [selectedCount, setSelectedCount] = useState<number>(25);
  const [isCustomCount, setIsCustomCount] = useState<boolean>(false);
  const [customCountInput, setCustomCountInput] = useState<string>("");
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const matchingJobs = useMemo(() => {
    const now = Date.now();

    if (cleanupType === "all") {
      return [...jobs];
    }

    if (cleanupType === "duplicates") {
      const seen = new Set<string>();
      const dupes: JobApplication[] = [];
      for (const j of jobs) {
        const key = `${(j.company || "").toLowerCase().trim()}::${(j.role || "").toLowerCase().trim()}::${(j.appliedDate || "").trim()}`;
        if (seen.has(key)) {
          dupes.push(j);
        } else {
          seen.add(key);
        }
      }
      return dupes;
    }

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

  async function executeDelete() {
    setIsDeleting(true);
    try {
      const idsToDelete = matchingJobs.map((j) => j.id);
      if (onDeleteJobs) {
        await onDeleteJobs(idsToDelete, cleanupType === "all");
      } else {
        for (const id of idsToDelete) {
          await onDeleteJob(id);
        }
      }
      setIsConfirmOpen(false);
      onClose();
    } catch (err) {
      console.error("Cleanup deletion failed:", err);
    } finally {
      setIsDeleting(false);
    }
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-[#0d1117] border border-[#30363d] rounded-lg">
              <button
                type="button"
                onClick={() => setCleanupType("all")}
                className={`py-1.5 px-2 rounded-md font-medium transition-colors cursor-pointer text-center ${
                  cleanupType === "all"
                    ? "bg-[#21262d] text-[#f0f6fc] shadow-xs"
                    : "text-[#8b949e] hover:text-[#c9d1d9]"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setCleanupType("duplicates")}
                className={`py-1.5 px-2 rounded-md font-medium transition-colors cursor-pointer text-center ${
                  cleanupType === "duplicates"
                    ? "bg-[#21262d] text-[#f0f6fc] shadow-xs"
                    : "text-[#8b949e] hover:text-[#c9d1d9]"
                }`}
              >
                Duplicates
              </button>
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
          {cleanupType === "all" && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs">
              <span className="font-semibold block text-red-300 mb-1">
                Delete All Applications
              </span>
              <span className="text-[#8b949e] leading-relaxed">
                This will delete all <span className="font-mono text-red-200 font-bold">{jobs.length}</span> application{jobs.length === 1 ? "" : "s"} currently in your tracker and database.
              </span>
            </div>
          )}

          {cleanupType === "duplicates" && (
            <div
              className={`p-3.5 rounded-lg border text-xs ${
                matchingJobs.length > 0
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-[#0d1117] border-[#30363d]"
              }`}
            >
              <span
                className={`font-semibold block mb-1 ${
                  matchingJobs.length > 0 ? "text-amber-300" : "text-[#c9d1d9]"
                }`}
              >
                {matchingJobs.length > 0
                  ? `Found ${matchingJobs.length} Duplicate Application${
                      matchingJobs.length === 1 ? "" : "s"
                    }`
                  : "No Duplicates Found"}
              </span>
              <p className="text-[#8b949e] leading-relaxed">
                {matchingJobs.length > 0
                  ? "Keeps the first instance of each application (matching company, role, and date) and deletes the identical duplicate copies from your database."
                  : "All applications in your tracker have unique company, role, or date combinations."}
              </p>
            </div>
          )}

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
            <div className="space-y-2.5">
              <label className="block text-[#8b949e] text-[11px] font-medium mb-1">
                Delete applications older than:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[30, 60, 90, 180].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => {
                      setSelectedDays(days);
                      setIsCustomDays(false);
                      setCustomDaysInput("");
                    }}
                    className={`py-2 px-1 text-center rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                      !isCustomDays && selectedDays === days
                        ? "border-[#58a6ff] bg-[#58a6ff]/10 text-[#58a6ff] font-semibold"
                        : "border-[#30363d] bg-[#0d1117] text-[#c9d1d9] hover:bg-[#21262d]"
                    }`}
                  >
                    {days} days
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[#8b949e] text-[11px] whitespace-nowrap">Or custom:</span>
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 45"
                    value={isCustomDays ? customDaysInput : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomDaysInput(val);
                      const num = parseInt(val, 10);
                      if (!isNaN(num) && num > 0) {
                        setSelectedDays(num);
                        setIsCustomDays(true);
                      }
                    }}
                    onFocus={() => {
                      if (!isCustomDays) {
                        setIsCustomDays(true);
                        if (!customDaysInput) setCustomDaysInput(String(selectedDays));
                      }
                    }}
                    className={`w-24 bg-[#0d1117] border ${
                      isCustomDays ? "border-[#58a6ff]" : "border-[#30363d]"
                    } text-[#f0f6fc] text-xs rounded-lg px-2.5 py-1.5 outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  />
                  <span className="text-[#8b949e] text-xs">days</span>
                </div>
              </div>
            </div>
          )}

          {cleanupType === "oldest" && (
            <div className="space-y-2.5">
              <label className="block text-[#8b949e] text-[11px] font-medium mb-1">
                Delete the oldest:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 25, 50, 100].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => {
                      setSelectedCount(cnt);
                      setIsCustomCount(false);
                      setCustomCountInput("");
                    }}
                    className={`py-2 px-1 text-center rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                      !isCustomCount && selectedCount === cnt
                        ? "border-[#58a6ff] bg-[#58a6ff]/10 text-[#58a6ff] font-semibold"
                        : "border-[#30363d] bg-[#0d1117] text-[#c9d1d9] hover:bg-[#21262d]"
                    }`}
                  >
                    {cnt} jobs
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[#8b949e] text-[11px] whitespace-nowrap">Or custom:</span>
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="number"
                    min="1"
                    max={jobs.length}
                    placeholder="e.g. 15"
                    value={isCustomCount ? customCountInput : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomCountInput(val);
                      const num = parseInt(val, 10);
                      if (!isNaN(num) && num > 0) {
                        setSelectedCount(num);
                        setIsCustomCount(true);
                      }
                    }}
                    onFocus={() => {
                      if (!isCustomCount) {
                        setIsCustomCount(true);
                        if (!customCountInput) setCustomCountInput(String(selectedCount));
                      }
                    }}
                    className={`w-24 bg-[#0d1117] border ${
                      isCustomCount ? "border-[#58a6ff]" : "border-[#30363d]"
                    } text-[#f0f6fc] text-xs rounded-lg px-2.5 py-1.5 outline-none font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  />
                  <span className="text-[#8b949e] text-xs">jobs</span>
                </div>
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
            disabled={matchingJobs.length === 0 || isDeleting}
            onClick={() => setIsConfirmOpen(true)}
            className="text-xs font-medium text-white bg-[#da3633] hover:bg-[#b62324] disabled:opacity-40 disabled:hover:bg-[#da3633] px-4 py-1.5 rounded-md transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            {isDeleting ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Deleting...</span>
              </>
            ) : cleanupType === "all" ? (
              `Delete All (${matchingJobs.length}) Applications`
            ) : cleanupType === "duplicates" ? (
              `Delete ${matchingJobs.length} Duplicate${matchingJobs.length === 1 ? "" : "s"}`
            ) : (
              `Delete ${matchingJobs.length > 0 ? matchingJobs.length : ""} Application${
                matchingJobs.length === 1 ? "" : "s"
              }`
            )}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDelete}
        title={
          cleanupType === "all"
            ? "Delete All Applications"
            : cleanupType === "duplicates"
            ? "Delete Duplicate Applications"
            : "Delete Applications"
        }
        message={
          cleanupType === "all"
            ? `Are you sure you want to permanently delete ALL ${matchingJobs.length} applications from your tracker and database? This cannot be undone.`
            : cleanupType === "duplicates"
            ? `Are you sure you want to delete ${matchingJobs.length} duplicate application${
                matchingJobs.length === 1 ? "" : "s"
              }? The original copy of each application will be kept.`
            : `Are you sure you want to permanently delete ${matchingJobs.length} application${
                matchingJobs.length === 1 ? "" : "s"
              }? This cannot be undone.`
        }
        confirmText={
          cleanupType === "all"
            ? "Delete All"
            : cleanupType === "duplicates"
            ? "Delete Duplicates"
            : "Delete"
        }
        isDestructive={true}
      />
    </div>
  );
}
