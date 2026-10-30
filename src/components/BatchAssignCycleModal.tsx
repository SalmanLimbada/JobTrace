"use client";

import { useState, useMemo } from "react";
import type { JobApplication } from "@/types/job";
import DatePicker from "@/components/DatePicker";

interface BatchAssignCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: JobApplication[];
  filteredJobs: JobApplication[];
  cycles: string[];
  activeCycle?: string;
  onAssign: (jobIds: string[], targetCycle: string) => Promise<void> | void;
}

export default function BatchAssignCycleModal({
  isOpen,
  onClose,
  jobs,
  filteredJobs,
  cycles,
  activeCycle,
  onAssign,
}: BatchAssignCycleModalProps) {
  const [selectedCycleOption, setSelectedCycleOption] = useState<string>(() => {
    if (activeCycle && activeCycle !== "All" && cycles.includes(activeCycle)) {
      return activeCycle;
    }
    if (cycles.length > 0) return cycles[0];
    return "__new__";
  });

  const [newCycleName, setNewCycleName] = useState("");
  const [mode, setMode] = useState<"filtered" | "all_untagged" | "date_range" | "all">("filtered");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCreatingNew = selectedCycleOption === "__new__";
  const isClearingCycle = selectedCycleOption === "__clear__";

  const targetCycleName = isCreatingNew
    ? newCycleName.trim()
    : isClearingCycle
    ? ""
    : selectedCycleOption;

  const candidateJobs = useMemo(() => {
    if (mode === "filtered") {
      return filteredJobs;
    }
    if (mode === "all_untagged") {
      return jobs.filter((j) => !j.cycle || j.cycle.trim() === "");
    }
    if (mode === "all") {
      return jobs;
    }
    if (mode === "date_range") {
      return jobs.filter((j) => {
        if (!j.appliedDate) return false;
        if (startDate && j.appliedDate < startDate) return false;
        if (endDate && j.appliedDate > endDate) return false;
        return true;
      });
    }
    return [];
  }, [mode, filteredJobs, jobs, startDate, endDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingNew && !newCycleName.trim()) return;
    if (candidateJobs.length === 0) return;

    setIsSubmitting(true);
    try {
      const ids = candidateJobs.map((j) => j.id);
      await onAssign(ids, targetCycleName);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-100"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-[#30363d] bg-[#161b22] shadow-2xl p-5 flex flex-col gap-4 text-xs animate-in zoom-in-95 duration-150">
        <div>
          <h3 className="text-sm font-semibold text-[#f0f6fc]">Batch Assign to Recruiting Cycle</h3>
          <p className="mt-1 text-xs text-[#8b949e]">
            Quickly organize past applications into a recruiting cycle.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Cycle Selection */}
          <div>
            <label className="block text-[11px] font-medium text-[#c9d1d9] mb-1.5">
              Target Cycle *
            </label>
            <select
              value={selectedCycleOption}
              onChange={(e) => setSelectedCycleOption(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] text-xs text-[#f0f6fc] rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] cursor-pointer"
            >
              {cycles.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__new__">+ Create new cycle...</option>
              <option value="__clear__">(Remove cycle / Untag)</option>
            </select>

            {isCreatingNew && (
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="e.g. Summer 2026 or Fall 2025"
                  value={newCycleName}
                  onChange={(e) => setNewCycleName(e.target.value)}
                  autoFocus
                  required
                  className="w-full bg-[#0d1117] border border-[#30363d] text-xs text-[#f0f6fc] rounded-lg px-3 py-1.5 outline-none focus:border-[#58a6ff]"
                />
              </div>
            )}
          </div>

          {/* Scope Selector */}
          <div>
            <label className="block text-[11px] font-medium text-[#c9d1d9] mb-1.5">
              Which applications should be updated?
            </label>
            <div className="space-y-1.5">
              <label
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                  mode === "filtered"
                    ? "bg-[#21262d] border-[#58a6ff] text-[#f0f6fc]"
                    : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="assignMode"
                    checked={mode === "filtered"}
                    onChange={() => setMode("filtered")}
                    className="accent-[#58a6ff]"
                  />
                  <span>Current filtered view</span>
                </div>
                <span className="font-mono text-[10px] bg-[#30363d] px-2 py-0.5 rounded-full text-[#c9d1d9]">
                  {filteredJobs.length}
                </span>
              </label>

              <label
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                  mode === "all_untagged"
                    ? "bg-[#21262d] border-[#58a6ff] text-[#f0f6fc]"
                    : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="assignMode"
                    checked={mode === "all_untagged"}
                    onChange={() => setMode("all_untagged")}
                    className="accent-[#58a6ff]"
                  />
                  <span>All untagged applications</span>
                </div>
                <span className="font-mono text-[10px] bg-[#30363d] px-2 py-0.5 rounded-full text-[#c9d1d9]">
                  {jobs.filter((j) => !j.cycle || j.cycle.trim() === "").length}
                </span>
              </label>

              <label
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                  mode === "date_range"
                    ? "bg-[#21262d] border-[#58a6ff] text-[#f0f6fc]"
                    : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="assignMode"
                    checked={mode === "date_range"}
                    onChange={() => setMode("date_range")}
                    className="accent-[#58a6ff]"
                  />
                  <span>By applied date range</span>
                </div>
                <span className="font-mono text-[10px] bg-[#30363d] px-2 py-0.5 rounded-full text-[#c9d1d9]">
                  {mode === "date_range" ? candidateJobs.length : "—"}
                </span>
              </label>

              <label
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                  mode === "all"
                    ? "bg-[#21262d] border-[#58a6ff] text-[#f0f6fc]"
                    : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="assignMode"
                    checked={mode === "all"}
                    onChange={() => setMode("all")}
                    className="accent-[#58a6ff]"
                  />
                  <span>All applications</span>
                </div>
                <span className="font-mono text-[10px] bg-[#30363d] px-2 py-0.5 rounded-full text-[#c9d1d9]">
                  {jobs.length}
                </span>
              </label>
            </div>
          </div>

          {/* Date Range Inputs */}
          {mode === "date_range" && (
            <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg grid grid-cols-2 gap-2 animate-in fade-in duration-100">
              <div>
                <span className="block text-[10px] text-[#8b949e] mb-1">From Date</span>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Select start date"
                  align="left"
                  className="w-full bg-[#161b22] border border-[#30363d] text-[#f0f6fc] text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[#58a6ff] cursor-pointer h-[32px]"
                />
              </div>
              <div>
                <span className="block text-[10px] text-[#8b949e] mb-1">To Date</span>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Select end date"
                  align="right"
                  className="w-full bg-[#161b22] border border-[#30363d] text-[#f0f6fc] text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[#58a6ff] cursor-pointer h-[32px]"
                />
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-[#30363d]/60">
            <span className="text-xs text-[#8b949e]">
              Will update <span className="text-[#f0f6fc] font-semibold font-mono">{candidateJobs.length}</span>{" "}
              {candidateJobs.length === 1 ? "application" : "applications"}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg border border-[#30363d] bg-transparent text-[#c9d1d9] hover:bg-[#21262d] font-medium transition-colors cursor-pointer text-xs disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || candidateJobs.length === 0 || (isCreatingNew && !newCycleName.trim())}
                className="px-4 py-1.5 rounded-lg text-white font-medium transition-colors cursor-pointer text-xs bg-[#238636] hover:bg-[#2ea043] disabled:opacity-40"
              >
                {isSubmitting ? "Assigning..." : isClearingCycle ? "Remove Cycle" : "Assign"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
