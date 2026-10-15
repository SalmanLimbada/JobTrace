"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { ApplicationStatus, JobApplication, JobHighlights } from "@/types/job";
import { exportApplicationsToCSV } from "@/lib/csv";
import CSVImportModal from "@/components/CSVImportModal";
import EditJobModal from "@/components/EditJobModal";
import ExportCSVModal from "@/components/ExportCSVModal";
import HighlightsVaultDrawer from "@/components/HighlightsVaultDrawer";
import {
  useSettings,
  STANDARD_COLUMN_NAMES,
  type StandardColumnsSettings,
} from "@/context/SettingsContext";

interface JobTableProps {
  jobs: JobApplication[];
  onStatusChange: (id: string, newStatus: ApplicationStatus) => void;
  onSaveEdit: (id: string, updated: Partial<JobApplication>) => void;
  onDeleteJob: (id: string) => void;
  onImportJobs: (newJobs: Record<string, JobApplication>, count: number) => void;
}

function formatUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed === "#" || trimmed.toLowerCase() === "n/a" || trimmed === "-") {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.includes(".")) {
    return `https://${trimmed}`;
  }
  return null;
}

function getFieldValue(job: JobApplication, fieldId: string): string | undefined {
  if (job.customFields && job.customFields[fieldId] !== undefined) {
    return job.customFields[fieldId];
  }
  if (fieldId === "salary") return job.salary;
  if (fieldId === "location") return job.location;
  if (fieldId === "deadlineDate") return job.deadlineDate;
  if (fieldId === "notes") return job.notes;
  return undefined;
}

export default function JobTable({
  jobs,
  onStatusChange,
  onSaveEdit,
  onDeleteJob,
  onImportJobs,
}: JobTableProps) {
  const {
    customFields,
    standardColumns,
    showRowNumbers,
    columnOrder,
    reorderColumns,
    statuses,
    shortcuts,
    isSettingsOpen,
    setIsSettingsOpen,
  } = useSettings();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [editingJob, setEditingJob] = useState<JobApplication | null>(null);
  const [highlightsJob, setHighlightsJob] = useState<JobApplication | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [dragOverSide, setDragOverSide] = useState<"left" | "right">("left");
  const isDraggingRef = useRef(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const pillTrackRef = useRef<HTMLDivElement>(null);
  const [thumbStyle, setThumbStyle] = useState({ left: 4, width: 0, opacity: 0 });

  // Global Keyboard Shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (editingJob || isImportModalOpen || isSettingsOpen) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === shortcuts.focusSearch?.toLowerCase()) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (key === shortcuts.addJob?.toLowerCase()) {
        e.preventDefault();
        const input = document.getElementById("new-job-company-input");
        if (input) {
          input.focus();
          input.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else if (key === shortcuts.openSettings?.toLowerCase()) {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, editingJob, isImportModalOpen, isSettingsOpen, setIsSettingsOpen]);

  // Click outside listener for "More ▾" dropdown
  useEffect(() => {
    if (!isMoreOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsMoreOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMoreOpen]);

  // Click outside listener for action menu (Import/Export CSV)
  useEffect(() => {
    if (!isActionsOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setIsActionsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsActionsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActionsOpen]);

  // Compute active ordered columns
  const activeCustomFieldIds = customFields.filter((f) => f.enabled).map((f) => f.id);
  const allActiveIds = new Set([
    ...Object.entries(standardColumns)
      .filter(([k, v]) => v && k !== "notes")
      .map(([k]) => k),
    ...activeCustomFieldIds,
  ]);

  const orderedVisibleColumns = columnOrder.filter((id) => allActiveIds.has(id));
  allActiveIds.forEach((id) => {
    if (!orderedVisibleColumns.includes(id)) {
      orderedVisibleColumns.push(id);
    }
  });

  const totalColumnCount = 1 + orderedVisibleColumns.length;

  function handleHeaderClick(colId: string) {
    if (isDraggingRef.current) return;
    if (sortColumn === colId) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(colId);
      setSortDirection("asc");
    }
  }

  function getColumnLabel(colId: string): string {
    if (colId in STANDARD_COLUMN_NAMES) {
      return STANDARD_COLUMN_NAMES[colId as keyof StandardColumnsSettings];
    }
    const custom = customFields.find((f) => f.id === colId);
    return custom?.name || colId;
  }

  // Distinct statuses from user settings + any existing jobs (memoized to keep stable reference)
  const allKnownStatuses = useMemo(() => {
    return Array.from(new Set([...statuses, ...jobs.map((j) => j.status)]));
  }, [statuses, jobs]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: jobs.length };
    allKnownStatuses.forEach((s) => {
      counts[s] = 0;
    });
    jobs.forEach((job) => {
      counts[job.status] = (counts[job.status] || 0) + 1;
    });
    return counts;
  }, [allKnownStatuses, jobs]);

  const MAX_VISIBLE = 4;
  const topStatuses = useMemo(() => {
    return statuses.slice(0, MAX_VISIBLE);
  }, [statuses]);

  const overflowStatuses = useMemo(() => {
    return allKnownStatuses.filter((s) => !topStatuses.includes(s));
  }, [allKnownStatuses, topStatuses]);

  const isOverflowSelected = overflowStatuses.includes(filterStatus);

  // Measure active pill position to animate sliding frosted glass thumb
  useEffect(() => {
    if (!pillTrackRef.current) return;
    const activeBtn = pillTrackRef.current.querySelector<HTMLElement>(`[data-active="true"]`);
    if (activeBtn) {
      setThumbStyle((prev) => {
        if (
          prev.left === activeBtn.offsetLeft &&
          prev.width === activeBtn.offsetWidth &&
          prev.opacity === 1
        ) {
          return prev;
        }
        return {
          left: activeBtn.offsetLeft,
          width: activeBtn.offsetWidth,
          opacity: 1,
        };
      });
    } else {
      setThumbStyle((prev) => (prev.opacity === 0 ? prev : { ...prev, opacity: 0 }));
    }
  }, [filterStatus, topStatuses, overflowStatuses]);

  // Filtered jobs: match status AND search across company, role, notes, salary, location, deadline, and custom fields!
  const filteredJobs = jobs.filter((job) => {
    const matchesStatus = filterStatus === "All" || job.status === filterStatus;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      job.company.toLowerCase().includes(query) ||
      job.role.toLowerCase().includes(query) ||
      (job.notes && job.notes.toLowerCase().includes(query)) ||
      (job.salary && job.salary.toLowerCase().includes(query)) ||
      (job.location && job.location.toLowerCase().includes(query)) ||
      (job.deadlineDate && job.deadlineDate.toLowerCase().includes(query)) ||
      (job.customFields &&
        Object.values(job.customFields).some((val) =>
          val.toLowerCase().includes(query)
        ));
    return matchesStatus && matchesSearch;
  });

  // Sorted jobs
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    if (!sortColumn) return 0;
    let valA = "";
    let valB = "";

    if (sortColumn === "company") {
      valA = a.company || "";
      valB = b.company || "";
    } else if (sortColumn === "role") {
      valA = a.role || "";
      valB = b.role || "";
    } else if (sortColumn === "status") {
      valA = a.status || "";
      valB = b.status || "";
    } else if (sortColumn === "appliedDate") {
      valA = a.appliedDate || "";
      valB = b.appliedDate || "";
    } else if (sortColumn === "url") {
      valA = a.url || "";
      valB = b.url || "";
    } else {
      valA = getFieldValue(a, sortColumn) || "";
      valB = getFieldValue(b, sortColumn) || "";
    }

    const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: "base" });
    return sortDirection === "asc" ? cmp : -cmp;
  });

  function renderCell(job: JobApplication, colId: string) {
    switch (colId) {
      case "company":
        return (
          <td key={colId} className="p-3 font-medium text-zinc-100">
            {job.company}
          </td>
        );
      case "role": {
        const highlightCount =
          (job.highlights?.requirements.length || 0) +
          (job.highlights?.techStack.length || 0) +
          (job.highlights?.interviewNotes.reduce((acc, r) => acc + r.bullets.length, 0) || 0);

        return (
          <td key={colId} className="p-3 text-zinc-300">
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-100">{job.role}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setHighlightsJob(job);
                }}
                title="Open Key Highlights Vault (Interview Prep)"
                className="text-[10px] font-medium text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 px-1.5 py-0.5 rounded inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <span>⚡ Prep</span>
                {highlightCount > 0 && (
                  <span className="font-mono text-[9px] text-amber-300 font-bold">
                    {highlightCount}
                  </span>
                )}
              </button>
            </div>
          </td>
        );
      }
      case "status":
        return (
          <td key={colId} className="p-3">
            <select
              value={job.status}
              onChange={(e) => onStatusChange(job.id, e.target.value as ApplicationStatus)}
              className="bg-zinc-800 text-zinc-200 text-xs px-2.5 py-1 rounded border border-zinc-700 outline-none cursor-pointer hover:border-zinc-500 transition-colors"
            >
              {allKnownStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </td>
        );
      case "appliedDate":
        return (
          <td key={colId} className="p-3 text-zinc-400 text-xs font-mono">
            {job.appliedDate}
          </td>
        );
      case "url": {
        const validUrl = formatUrl(job.url);
        return (
          <td key={colId} className="p-3">
            {validUrl ? (
              <a
                href={validUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline text-xs inline-flex items-center gap-1 font-medium"
              >
                View Post ↗
              </a>
            ) : (
              <span className="text-zinc-600 text-xs font-mono">—</span>
            )}
          </td>
        );
      }
      default: {
        const customField = customFields.find((f) => f.id === colId);
        const val = getFieldValue(job, colId);
        return (
          <td
            key={colId}
            className={`p-3 text-xs ${
              colId === "notes"
                ? "text-zinc-400 max-w-xs truncate"
                : customField?.type === "date"
                ? "text-zinc-400 font-mono"
                : "text-zinc-300"
            }`}
            title={colId === "notes" ? val : undefined}
          >
            {val || <span className="text-zinc-600">—</span>}
          </td>
        );
      }
    }
  }

  return (
    <div>
      {/* Search & Status Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search company or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm rounded px-3 py-2 outline-none focus:border-zinc-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Menu (Import / Export CSV) */}
          <div className="relative" ref={actionsRef}>
            <button
              type="button"
              onClick={() => setIsActionsOpen((prev) => !prev)}
              title="Import or export applications"
              aria-label="Import or export data"
              aria-expanded={isActionsOpen}
              className={`h-[38px] w-[38px] rounded border border-zinc-700 transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
                isActionsOpen
                  ? "bg-zinc-800 text-white border-zinc-500"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>

            {isActionsOpen && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-lg border border-[#30363d] bg-[#161b22] shadow-xl z-30 p-1 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsActionsOpen(false);
                    setIsImportModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#c9d1d9] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-md transition-colors text-left cursor-pointer"
                >
                  <svg className="w-4 h-4 text-[#58a6ff] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <div>
                    <span className="font-medium block">Import CSV</span>
                    <span className="text-[10px] text-[#8b949e] block">Upload applications from file</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsActionsOpen(false);
                    setIsExportModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#c9d1d9] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-md transition-colors text-left cursor-pointer"
                >
                  <svg className="w-4 h-4 text-[#3fb950] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <div>
                    <span className="font-medium block">Export Applications</span>
                    <span className="text-[10px] text-[#8b949e] block">Download as CSV or Excel</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Segmented Status Pill Bar with iOS Sliding Frosted Glass Thumb */}
        <div className="w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <div
            ref={pillTrackRef}
            className="filter-toggle-track relative inline-flex items-center bg-[#0d1117] border border-[#30363d] rounded-lg p-1 max-w-full shadow-inner gap-0.5 shrink-0"
          >
          {/* iOS-Style Sliding Frosted Glass Thumb */}
          <div
            className="filter-slider-thumb absolute top-1 bottom-1 rounded-md bg-white/15 backdrop-blur-md border border-white/20 shadow-sm transition-all duration-200 ease-out pointer-events-none"
            style={{
              left: `${thumbStyle.left}px`,
              width: `${thumbStyle.width}px`,
              opacity: thumbStyle.opacity,
            }}
          />

          {/* "All" button */}
          <button
            type="button"
            data-active={filterStatus === "All" ? "true" : "false"}
            onClick={() => setFilterStatus("All")}
            className={`relative z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              filterStatus === "All"
                ? "text-[#f0f6fc] font-semibold"
                : "text-[#8b949e] hover:text-[#c9d1d9]"
            }`}
          >
            <span>All</span>
            <span
              className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] leading-tight transition-colors ${
                filterStatus === "All"
                  ? "bg-[#30363d] text-[#f0f6fc] font-semibold active-filter-badge"
                  : "bg-[#161b22] text-[#8b949e] inactive-filter-badge"
              }`}
            >
              {statusCounts["All"] || 0}
            </span>
          </button>

          {/* Top 4 visible statuses */}
          {topStatuses.map((s) => {
            const isSelected = filterStatus === s;
            const count = statusCounts[s] || 0;

            return (
              <button
                key={s}
                type="button"
                data-active={isSelected ? "true" : "false"}
                onClick={() => setFilterStatus(s)}
                className={`relative z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "text-[#f0f6fc] font-semibold"
                    : "text-[#8b949e] hover:text-[#c9d1d9]"
                }`}
              >
                <span>{s}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] leading-tight transition-colors ${
                    isSelected
                      ? "bg-[#30363d] text-[#f0f6fc] font-semibold active-filter-badge"
                      : "bg-[#161b22] text-[#8b949e] inactive-filter-badge"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {/* "More ▾" Overflow Dropdown */}
          {overflowStatuses.length > 0 && (
            <div className="relative z-10" ref={moreRef}>
              <button
                type="button"
                data-active={isOverflowSelected ? "true" : "false"}
                onClick={() => setIsMoreOpen(!isMoreOpen)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isOverflowSelected
                    ? "text-[#58a6ff] font-semibold"
                    : "text-[#8b949e] hover:text-[#c9d1d9]"
                }`}
                title="More status filters"
              >
                <span>
                  {isOverflowSelected ? filterStatus : "More"}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] leading-tight transition-colors ${
                    isOverflowSelected
                      ? "bg-[#58a6ff]/20 text-[#58a6ff]"
                      : "bg-[#161b22] text-[#8b949e]"
                  }`}
                >
                  {isOverflowSelected
                    ? statusCounts[filterStatus] || 0
                    : overflowStatuses.reduce(
                        (acc, s) => acc + (statusCounts[s] || 0),
                        0
                      )}
                </span>
                <svg
                  className={`w-3 h-3 transition-transform duration-150 ${
                    isMoreOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Popover Dropdown Menu */}
              {isMoreOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-40 min-w-[170px] bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] uppercase font-semibold text-[#8b949e] tracking-wider border-b border-[#30363d]/60 mb-1">
                    Other Statuses
                  </div>
                  <div className="space-y-0.5 max-h-56 overflow-y-auto">
                    {overflowStatuses.map((s) => {
                      const isSelected = filterStatus === s;
                      const count = statusCounts[s] || 0;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setFilterStatus(s);
                            setIsMoreOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-[#21262d] text-[#58a6ff] font-medium"
                              : "text-[#c9d1d9] hover:bg-[#21262d]/70 hover:text-white"
                          }`}
                        >
                          <span className="truncate mr-2">{s}</span>
                          <span
                            className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                              isSelected
                                ? "bg-[#58a6ff]/20 text-[#58a6ff]"
                                : "bg-[#0d1117] text-[#8b949e]"
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/20 shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-zinc-900/90 text-zinc-400 text-xs uppercase font-medium border-b border-zinc-800">
            <tr>
              <th className={`${showRowNumbers ? "w-10 px-2" : "w-8 p-0"} text-center font-mono text-[11px]`}>
                {showRowNumbers ? "#" : ""}
              </th>
              {orderedVisibleColumns.map((colId) => {
                const isSorted = sortColumn === colId;
                const isDragged = draggedColId === colId;
                const isDragOver = dragOverColId === colId && !isDragged;

                return (
                  <th
                    key={colId}
                    draggable={true}
                    onDragStart={(e) => {
                      isDraggingRef.current = true;
                      setDraggedColId(colId);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", colId);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (draggedColId && draggedColId !== colId) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const midpoint = rect.left + rect.width / 2;
                        const side = e.clientX < midpoint ? "left" : "right";
                        setDragOverColId((prev) => (prev !== colId ? colId : prev));
                        setDragOverSide((prev) => (prev !== side ? side : prev));
                      }
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget === e.target) {
                        setDragOverColId((prev) => (prev === colId ? null : prev));
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const source = draggedColId || e.dataTransfer.getData("text/plain");
                      if (source && source !== colId) {
                        reorderColumns(source, colId, dragOverSide);
                      }
                      setDraggedColId(null);
                      setDragOverColId(null);
                      setTimeout(() => {
                        isDraggingRef.current = false;
                      }, 100);
                    }}
                    onDragEnd={() => {
                      setDraggedColId(null);
                      setDragOverColId(null);
                      setTimeout(() => {
                        isDraggingRef.current = false;
                      }, 100);
                    }}
                    onClick={() => handleHeaderClick(colId)}
                    className={`p-3.5 whitespace-nowrap select-none transition-all duration-150 group/header relative ${
                      isDragged
                        ? "opacity-30 bg-zinc-800/80 cursor-grabbing"
                        : "cursor-grab active:cursor-grabbing hover:text-zinc-200"
                    } ${
                      isDragOver
                        ? dragOverSide === "left"
                          ? "border-l-2 border-l-[#58a6ff] bg-[#58a6ff]/10"
                          : "border-r-2 border-r-[#58a6ff] bg-[#58a6ff]/10"
                        : ""
                    }`}
                    title="Click to sort, drag left/right to reorder"
                  >
                    <div className="inline-flex items-center gap-1.5 pointer-events-none">
                      <span>{getColumnLabel(colId)}</span>
                      <span className="text-[10px] text-zinc-400 group-hover/header:text-zinc-200">
                        {isSorted ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedJobs.length === 0 ? (
              <tr>
                <td
                  colSpan={totalColumnCount}
                  className="p-8 text-center text-zinc-500 text-sm"
                >
                  No job applications found matching your criteria.
                  {(searchQuery || filterStatus !== "All") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setFilterStatus("All");
                      }}
                      className="block mx-auto mt-2 text-xs text-blue-400 hover:underline cursor-pointer"
                    >
                      Clear search and filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              sortedJobs.map((job, index) => (
                <tr
                  key={job.id}
                  className="group border-b border-zinc-800/80 hover:bg-zinc-800/30 transition-colors"
                >
                  {/* Left-edge: Row Number / Hover Slide-Out Pencil */}
                  <td className={`${showRowNumbers ? "w-10 px-2" : "w-8 p-0"} text-center relative select-none`}>
                    {showRowNumbers && (
                      <span className="font-mono text-[11px] text-[#8b949e] transition-opacity duration-150 sm:group-hover:opacity-0 hidden sm:block">
                        {index + 1}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingJob(job)}
                      title="Edit application"
                      className={`opacity-100 sm:opacity-0 sm:-translate-x-1 sm:group-hover:opacity-100 sm:group-hover:translate-x-0 transition-all duration-200 text-zinc-400 hover:text-[#58a6ff] p-1.5 rounded hover:bg-zinc-800 cursor-pointer inline-flex items-center justify-center ${
                        showRowNumbers ? "sm:absolute sm:inset-0 sm:m-auto w-6 h-6" : ""
                      }`}
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  </td>

                  {orderedVisibleColumns.map((colId) => renderCell(job, colId))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <EditJobModal
        job={editingJob}
        isOpen={!!editingJob}
        onClose={() => setEditingJob(null)}
        onSave={onSaveEdit}
        onDelete={onDeleteJob}
        onOpenHighlights={() => {
          if (editingJob) setHighlightsJob(editingJob);
        }}
      />

      <HighlightsVaultDrawer
        job={highlightsJob ? jobs.find((j) => j.id === highlightsJob.id) || highlightsJob : null}
        isOpen={!!highlightsJob}
        onClose={() => setHighlightsJob(null)}
        onSave={(jobId, highlights) => {
          onSaveEdit(jobId, { highlights });
          setHighlightsJob((prev) => (prev && prev.id === jobId ? { ...prev, highlights } : prev));
        }}
      />

      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={onImportJobs}
      />

      <ExportCSVModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        allJobs={jobs}
        filteredJobs={sortedJobs}
        customFields={customFields}
      />
    </div>
  );
}
