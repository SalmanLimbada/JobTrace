"use client";

import { useState, useRef, useEffect } from "react";
import type { ApplicationStatus, JobApplication } from "@/types/job";
import { exportApplicationsToCSV } from "@/lib/csv";
import CSVImportModal from "@/components/CSVImportModal";
import EditJobModal from "@/components/EditJobModal";
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
    shortcuts,
    isSettingsOpen,
    setIsSettingsOpen,
  } = useSettings();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | "All">("All");
  const [editingJob, setEditingJob] = useState<JobApplication | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [dragOverSide, setDragOverSide] = useState<"left" | "right">("left");
  const isDraggingRef = useRef(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Compute active ordered columns
  const activeCustomFieldIds = customFields.filter((f) => f.enabled).map((f) => f.id);
  const allActiveIds = new Set([
    ...Object.entries(standardColumns)
      .filter(([, v]) => v)
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

  // Filtered jobs
  const filteredJobs = jobs.filter((job) => {
    const matchesStatus = filterStatus === "All" || job.status === filterStatus;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      job.company.toLowerCase().includes(query) ||
      job.role.toLowerCase().includes(query);
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
    } else if (sortColumn === "notes") {
      valA = a.notes || "";
      valB = b.notes || "";
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
      case "role":
        return (
          <td key={colId} className="p-3 text-zinc-300">
            {job.role}
          </td>
        );
      case "status":
        return (
          <td key={colId} className="p-3">
            <select
              value={job.status}
              onChange={(e) => onStatusChange(job.id, e.target.value as ApplicationStatus)}
              className="bg-zinc-800 text-zinc-200 text-xs px-2.5 py-1 rounded border border-zinc-700 outline-none cursor-pointer hover:border-zinc-500 transition-colors"
            >
              <option value="Applied">Applied</option>
              <option value="Interview">Interview</option>
              <option value="Offer">Offer</option>
              <option value="Rejected">Rejected</option>
              <option value="Other">Other</option>
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
      case "notes":
        return (
          <td key={colId} className="p-3 text-zinc-400 text-xs max-w-xs truncate" title={job.notes}>
            {job.notes || <span className="text-zinc-600">—</span>}
          </td>
        );
      default: {
        const customField = customFields.find((f) => f.id === colId);
        const val = getFieldValue(job, colId);
        return (
          <td
            key={colId}
            className={`p-3 text-xs ${
              customField?.type === "date" ? "text-zinc-400 font-mono" : "text-zinc-300"
            }`}
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
        <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center flex-1 max-w-md">
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
          <button
            type="button"
            onClick={() => exportApplicationsToCSV(jobs, customFields)}
            className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 px-3 py-2 rounded transition-colors cursor-pointer whitespace-nowrap"
            title="Download applications as CSV"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 px-3 py-2 rounded transition-colors cursor-pointer whitespace-nowrap"
            title="Upload applications from CSV"
          >
            Import CSV
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          {(["All", "Applied", "Interview", "Offer", "Rejected", "Other"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1.5 rounded transition-colors cursor-pointer ${
                filterStatus === s
                  ? "bg-zinc-100 text-zinc-900 font-semibold"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              {s}
            </button>
          ))}
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
                        setDragOverColId(colId);
                        setDragOverSide(side);
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
                      <span className="font-mono text-[11px] text-[#8b949e] transition-opacity duration-150 group-hover:opacity-0 block">
                        {index + 1}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingJob(job)}
                      title="Edit application"
                      className={`opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-zinc-400 hover:text-[#58a6ff] p-1.5 rounded hover:bg-zinc-800 cursor-pointer inline-flex items-center justify-center ${
                        showRowNumbers ? "absolute inset-0 m-auto w-6 h-6" : ""
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
      />

      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={onImportJobs}
      />
    </div>
  );
}
