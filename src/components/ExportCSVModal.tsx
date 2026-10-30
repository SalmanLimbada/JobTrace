"use client";

import { useState, useMemo, useEffect } from "react";
import type { JobApplication, CustomFieldDefinition } from "@/types/job";
import { exportApplicationsToCSV, exportApplicationsToExcel } from "@/lib/csv";
import { getLocalDateString } from "@/lib/jobId";
import DatePicker from "@/components/DatePicker";

interface ExportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  allJobs: JobApplication[];
  filteredJobs: JobApplication[];
  customFields?: CustomFieldDefinition[];
}

type ExportFormat = "csv" | "excel";
type ExportScope = "all" | "filtered";
type RowSliceMode = "all" | "last" | "first";
type DateFilterMode = "all" | "range";

export default function ExportCSVModal({
  isOpen,
  onClose,
  allJobs,
  filteredJobs,
  customFields,
}: ExportCSVModalProps) {
  const hasFilter = filteredJobs.length < allJobs.length;

  const [format, setFormat] = useState<ExportFormat>("csv");
  const [scope, setScope] = useState<ExportScope>(hasFilter ? "filtered" : "all");

  // Date filtering state
  const [dateMode, setDateMode] = useState<DateFilterMode>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Row quantity / slice state ("all" | "last" N | "first" N)
  const [sliceMode, setSliceMode] = useState<RowSliceMode>("all");
  const [rowCount, setRowCount] = useState<number>(Math.min(25, allJobs.length || 25));

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setScope(hasFilter ? "filtered" : "all");
      setDateMode("all");
      setStartDate("");
      setEndDate("");
      setSliceMode("all");
      setRowCount(Math.min(25, allJobs.length || 25));
    }
  }, [isOpen, hasFilter, allJobs.length]);

  // Keyboard Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Quick preset helper for dates
  function applyDatePreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setDateMode("range");
    setStartDate(getLocalDateString(start));
    setEndDate(getLocalDateString(end));
  }

  // 1. Base scope selection
  const baseJobs = useMemo(() => {
    return scope === "filtered" ? filteredJobs : allJobs;
  }, [scope, filteredJobs, allJobs]);

  // 2. Date filtering
  const dateFilteredJobs = useMemo(() => {
    if (dateMode === "all" || (!startDate && !endDate)) {
      return baseJobs;
    }
    return baseJobs.filter((job) => {
      const applied = job.appliedDate;
      if (!applied) return false;
      if (startDate && applied < startDate) return false;
      if (endDate && applied > endDate) return false;
      return true;
    });
  }, [baseJobs, dateMode, startDate, endDate]);

  // 3. Row slicing (all, last N, first N)
  const finalExportJobs = useMemo(() => {
    if (sliceMode === "all" || rowCount <= 0) {
      return dateFilteredJobs;
    }
    if (sliceMode === "last") {
      // Latest N (from end of list)
      return dateFilteredJobs.slice(-rowCount);
    }
    if (sliceMode === "first") {
      // First N (from start of list)
      return dateFilteredJobs.slice(0, rowCount);
    }
    return dateFilteredJobs;
  }, [dateFilteredJobs, sliceMode, rowCount]);

  if (!isOpen) return null;

  function handleExport() {
    if (finalExportJobs.length === 0) return;
    if (format === "excel") {
      exportApplicationsToExcel(finalExportJobs, customFields);
    } else {
      exportApplicationsToCSV(finalExportJobs, customFields);
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-[#30363d] bg-[#161b22] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-[#3fb950]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <h2 className="text-sm font-semibold text-[#f0f6fc]">
              Export Applications
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#f0f6fc] p-1 rounded-md text-xs transition-colors cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 space-y-4 max-h-[80vh] sm:max-h-[75vh] overflow-y-auto">
          {/* 1. Format Choice */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  format === "csv"
                    ? "bg-[#21262d] border-[#58a6ff] text-[#f0f6fc] shadow-xs"
                    : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/50"
                }`}
              >
                <span>📄</span>
                <span>CSV File (.csv)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat("excel")}
                className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  format === "excel"
                    ? "bg-[#21262d] border-[#2ea043] text-[#f0f6fc] shadow-xs"
                    : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/50"
                }`}
              >
                <span>📊</span>
                <span>Excel Sheet (.xls)</span>
              </button>
            </div>
          </div>

          {/* 2. Scope Choice */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider mb-2">
              Applications Scope
            </label>
            <div className="space-y-1.5">
              <label
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  scope === "all"
                    ? "bg-[#21262d] border-[#58a6ff] text-[#f0f6fc]"
                    : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scope"
                    value="all"
                    checked={scope === "all"}
                    onChange={() => setScope("all")}
                    className="accent-[#58a6ff]"
                  />
                  <span>All applications in database</span>
                </div>
                <span className="font-mono text-[11px] bg-[#30363d] px-2 py-0.5 rounded-full text-[#c9d1d9]">
                  {allJobs.length}
                </span>
              </label>

              <label
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  scope === "filtered"
                    ? "bg-[#21262d] border-[#58a6ff] text-[#f0f6fc]"
                    : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="scope"
                    value="filtered"
                    checked={scope === "filtered"}
                    onChange={() => setScope("filtered")}
                    className="accent-[#58a6ff]"
                  />
                  <span>Current filtered table view</span>
                </div>
                <span className="font-mono text-[11px] bg-[#30363d] px-2 py-0.5 rounded-full text-[#c9d1d9]">
                  {filteredJobs.length}
                </span>
              </label>
            </div>
          </div>

          {/* 3. Date Range Filter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider">
                Date Applied Filter
              </label>
              {dateMode === "range" && (
                <button
                  type="button"
                  onClick={() => {
                    setDateMode("all");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-[10px] text-[#58a6ff] hover:underline cursor-pointer"
                >
                  Reset to All
                </button>
              )}
            </div>

            <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-2.5">
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 text-[#c9d1d9] cursor-pointer">
                  <input
                    type="radio"
                    name="dateMode"
                    value="all"
                    checked={dateMode === "all"}
                    onChange={() => setDateMode("all")}
                    className="accent-[#58a6ff]"
                  />
                  <span>All dates</span>
                </label>
                <label className="flex items-center gap-1.5 text-[#c9d1d9] cursor-pointer">
                  <input
                    type="radio"
                    name="dateMode"
                    value="range"
                    checked={dateMode === "range"}
                    onChange={() => setDateMode("range")}
                    className="accent-[#58a6ff]"
                  />
                  <span>Date range</span>
                </label>
              </div>

              {dateMode === "range" && (
                <div className="space-y-2 pt-1 animate-in fade-in duration-100">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="block text-[10px] text-[#8b949e] mb-1">From</span>
                      <DatePicker
                        value={startDate}
                        onChange={setStartDate}
                        placeholder="Select start date"
                        align="left"
                        className="w-full bg-[#161b22] border border-[#30363d] text-[#f0f6fc] text-xs rounded px-2.5 py-1.5 outline-none focus:border-[#58a6ff] cursor-pointer h-[32px]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#8b949e] mb-1">To</span>
                      <DatePicker
                        value={endDate}
                        onChange={setEndDate}
                        placeholder="Select end date"
                        align="right"
                        className="w-full bg-[#161b22] border border-[#30363d] text-[#f0f6fc] text-xs rounded px-2.5 py-1.5 outline-none focus:border-[#58a6ff] cursor-pointer h-[32px]"
                      />
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-[#8b949e]">Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyDatePreset(7)}
                      className="text-[10px] bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] px-2 py-0.5 rounded transition-colors cursor-pointer"
                    >
                      Last 7d
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset(30)}
                      className="text-[10px] bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] px-2 py-0.5 rounded transition-colors cursor-pointer"
                    >
                      Last 30d
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset(90)}
                      className="text-[10px] bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] px-2 py-0.5 rounded transition-colors cursor-pointer"
                    >
                      Last 90d
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. Row Quantity Slicing (All vs Last N vs First N) */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider mb-2">
              Row Limit & Quantity
            </label>
            <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-2.5 text-xs">
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSliceMode("all")}
                  className={`py-1.5 px-2 rounded border text-xs font-medium transition-all text-center cursor-pointer ${
                    sliceMode === "all"
                      ? "bg-[#21262d] border-[#58a6ff] text-[#f0f6fc]"
                      : "bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]"
                  }`}
                >
                  All Rows
                </button>
                <button
                  type="button"
                  onClick={() => setSliceMode("last")}
                  className={`py-1.5 px-2 rounded border text-xs font-medium transition-all text-center cursor-pointer ${
                    sliceMode === "last"
                      ? "bg-[#21262d] border-[#58a6ff] text-[#f0f6fc]"
                      : "bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]"
                  }`}
                >
                  Last N Rows
                </button>
                <button
                  type="button"
                  onClick={() => setSliceMode("first")}
                  className={`py-1.5 px-2 rounded border text-xs font-medium transition-all text-center cursor-pointer ${
                    sliceMode === "first"
                      ? "bg-[#21262d] border-[#58a6ff] text-[#f0f6fc]"
                      : "bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]"
                  }`}
                >
                  First N Rows
                </button>
              </div>

              {sliceMode !== "all" && (
                <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-100">
                  <span className="text-xs text-[#8b949e]">
                    {sliceMode === "last" ? "Latest" : "First"}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={dateFilteredJobs.length}
                    value={rowCount}
                    onChange={(e) =>
                      setRowCount(
                        Math.max(
                          1,
                          Math.min(
                            dateFilteredJobs.length || 1,
                            Number(e.target.value) || 1
                          )
                        )
                      )
                    }
                    className="w-20 bg-[#161b22] border border-[#30363d] text-[#f0f6fc] text-xs rounded px-2.5 py-1 text-center font-mono outline-none focus:border-[#58a6ff]"
                  />
                  <span className="text-xs text-[#8b949e]">
                    rows (out of {dateFilteredJobs.length} available)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-t border-[#30363d] bg-[#0d1117] gap-2.5 sm:gap-0">
          <span className="text-xs text-[#8b949e] text-center sm:text-left">
            Exporting{" "}
            <strong className="text-[#f0f6fc] font-mono">
              {finalExportJobs.length}
            </strong>{" "}
            applications
          </span>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-[#c9d1d9] hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={finalExportJobs.length === 0}
              onClick={handleExport}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                finalExportJobs.length === 0
                  ? "bg-[#21262d] text-[#8b949e] opacity-50 cursor-not-allowed"
                  : format === "excel"
                  ? "bg-[#2ea043] hover:bg-[#3fb950] text-white"
                  : "bg-[#238636] hover:bg-[#2ea043] text-white"
              }`}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>Download {format === "excel" ? "Excel (.xls)" : "CSV"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
