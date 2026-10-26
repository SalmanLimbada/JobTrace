"use client";

import { useState, useRef, useEffect, useMemo, useDeferredValue } from "react";
import type { ApplicationStatus, JobApplication } from "@/types/job";
import { exportApplicationsToCSV } from "@/lib/csv";
import CSVImportModal from "@/components/CSVImportModal";
import EditJobModal from "@/components/EditJobModal";
import ExportCSVModal from "@/components/ExportCSVModal";
import CleanUpModal from "@/components/CleanUpModal";
import ConfirmModal from "@/components/ConfirmModal";
import SimpleRequirementsDrawer from "@/components/SimpleRequirementsDrawer";
import NoteDrawer, { type NoteDrawerItem } from "@/components/NoteDrawer";
import { getEffectiveJobId } from "@/lib/jobId";
import {
  useSettings,
  STANDARD_COLUMN_NAMES,
  type StandardColumnsSettings,
} from "@/context/SettingsContext";

const STORAGE_SORT_KEY = "jobtrace_table_sort";
const INITIAL_BATCH = 60;
const BATCH_SIZE = 60;

interface JobTableProps {
  jobs: JobApplication[];
  onStatusChange: (id: string, newStatus: ApplicationStatus) => void;
  onSaveEdit: (id: string, updated: Partial<JobApplication>) => void;
  onDeleteJob: (id: string) => Promise<void> | void;
  onDeleteJobs?: (ids: string[], isAll?: boolean) => Promise<void> | void;
  onImportJobs: (newJobs: Record<string, JobApplication>, count: number) => void;
  editingJob?: JobApplication | null;
  onEditJob?: (job: JobApplication | null) => void;
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

function getStatusBadgeStyle(status: string): string {
  switch (status.toLowerCase()) {
    case "applied":
      return "status-badge-applied bg-[#58a6ff]/15 text-[#58a6ff] border-[#58a6ff]/35 hover:bg-[#58a6ff]/25";
    case "interview":
    case "oa / assessment":
    case "phone screen":
    case "technical screen":
    case "behavioral":
      return "status-badge-interview bg-[#d29922]/15 text-[#d29922] border-[#d29922]/35 hover:bg-[#d29922]/25";
    case "offer":
      return "status-badge-offer bg-[#3fb950]/15 text-[#3fb950] border-[#3fb950]/35 hover:bg-[#3fb950]/25";
    case "rejected":
    case "withdrawn":
      return "status-badge-rejected bg-[#f85149]/15 text-[#f85149] border-[#f85149]/35 hover:bg-[#f85149]/25";
    default:
      return "status-badge-other bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500";
  }
}

export function getStatusOptionClass(status: string): string {
  switch (status.toLowerCase()) {
    case "applied":
      return "status-option-applied";
    case "interview":
    case "oa / assessment":
    case "phone screen":
    case "technical screen":
    case "behavioral":
      return "status-option-interview";
    case "offer":
      return "status-option-offer";
    case "rejected":
    case "withdrawn":
      return "status-option-rejected";
    default:
      return "status-option-other";
  }
}

function getRowStatusStyle(status: string): { borderClass: string; dimClass: string } {
  switch (status.toLowerCase()) {
    case "offer":
      return {
        borderClass: "border-l-2 border-l-[#3fb950] row-border-offer",
        dimClass: "hover:bg-[#3fb950]/5",
      };
    case "interview":
    case "oa / assessment":
    case "phone screen":
    case "technical screen":
    case "behavioral":
      return {
        borderClass: "border-l-2 border-l-[#d29922] row-border-interview",
        dimClass: "hover:bg-[#d29922]/5",
      };
    case "applied":
      return {
        borderClass: "border-l-2 border-l-[#58a6ff] row-border-applied",
        dimClass: "hover:bg-[#58a6ff]/5",
      };
    case "rejected":
    case "withdrawn":
      return {
        borderClass: "border-l-2 border-l-[#f85149]/40 row-border-rejected",
        dimClass: "opacity-65 hover:opacity-100",
      };
    default:
      return {
        borderClass: "border-l-2 border-l-transparent",
        dimClass: "",
      };
  }
}

export default function JobTable({
  jobs,
  onStatusChange,
  onSaveEdit,
  onDeleteJob,
  onDeleteJobs,
  onImportJobs,
  editingJob: editingJobProp,
  onEditJob,
}: JobTableProps) {
  const {
    customFields,
    standardColumns,
    showRowNumbers,
    columnOrder,
    reorderColumns,
    statuses,
    shortcuts,
    extensionSettings,
    filterStyle,
  } = useSettings();

  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const mql = window.matchMedia("(max-width: 639px)");
    setIsMobileScreen(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobileScreen(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [internalEditingJob, setInternalEditingJob] = useState<JobApplication | null>(null);
  const editingJob = editingJobProp !== undefined ? editingJobProp : internalEditingJob;
  const setEditingJob = (job: JobApplication | null) => {
    if (onEditJob) {
      onEditJob(job);
    } else {
      setInternalEditingJob(job);
    }
  };
  const [selectedRequirementsJob, setSelectedRequirementsJob] = useState<JobApplication | null>(null);
  const [viewingDetail, setViewingDetail] = useState<NoteDrawerItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCleanUpModalOpen, setIsCleanUpModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<JobApplication | null>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>("appliedDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [mobileView, setMobileView] = useState<"cards" | "table">("cards");

  // Load saved sort preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SORT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          typeof parsed.column === "string" &&
          (parsed.direction === "asc" || parsed.direction === "desc")
        ) {
          setSortColumn(parsed.column);
          setSortDirection(parsed.direction);
        }
      }
    } catch {}
  }, []);

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
    ...(extensionSettings?.extractRequirements && extensionSettings?.requirementsDisplay === "column"
      ? ["keyRequirements"]
      : []),
  ]);

  const orderedVisibleColumns = columnOrder.filter((id) => allActiveIds.has(id));
  allActiveIds.forEach((id) => {
    if (!orderedVisibleColumns.includes(id)) {
      orderedVisibleColumns.push(id);
    }
  });

  const totalColumnCount = 2 + orderedVisibleColumns.length;

  function handleHeaderClick(colId: string) {
    if (isDraggingRef.current) return;
    let nextCol = colId;
    let nextDir: "asc" | "desc" = "asc";

    if (sortColumn === colId) {
      nextDir = sortDirection === "asc" ? "desc" : "asc";
    } else {
      nextCol = colId;
      nextDir = "asc";
    }

    setSortColumn(nextCol);
    setSortDirection(nextDir);
    try {
      localStorage.setItem(
        STORAGE_SORT_KEY,
        JSON.stringify({ column: nextCol, direction: nextDir })
      );
    } catch {}
  }

  function getColumnLabel(colId: string): string {
    if (colId === "keyRequirements") {
      return "Key Requirements";
    }
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

  const MAX_VISIBLE = 8;
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

  // Filtered jobs: match status AND search across company, role, notes, salary, location, deadline, url, jobId, and custom fields!
  const filteredJobs = useMemo(() => {
    const query = deferredQuery.toLowerCase().trim();
    if (!query) {
      if (filterStatus === "All") return jobs;
      return jobs.filter((j) => j.status === filterStatus);
    }

    const cleanQuery = query.replace(/[^a-z0-9]/g, "");

    return jobs.filter((job) => {
      const matchesStatus = filterStatus === "All" || job.status === filterStatus;
      if (!matchesStatus) return false;

      // 1. Core text fields
      if (job.company.toLowerCase().includes(query)) return true;
      if (job.role.toLowerCase().includes(query)) return true;
      if (job.notes && job.notes.toLowerCase().includes(query)) return true;
      if (job.salary && job.salary.toLowerCase().includes(query)) return true;
      if (job.location && job.location.toLowerCase().includes(query)) return true;
      if (job.deadlineDate && job.deadlineDate.toLowerCase().includes(query)) return true;

      // 2. URL search (matches full URL, domain, path, parameters, and embedded IDs)
      if (job.url) {
        const lowerUrl = job.url.toLowerCase();
        if (lowerUrl.includes(query)) return true;
        if (cleanQuery.length >= 3 && lowerUrl.replace(/[^a-z0-9]/g, "").includes(cleanQuery)) {
          return true;
        }
      }

      // 3. Direct Job ID property
      if (job.jobId) {
        const lowerJobId = job.jobId.toLowerCase();
        if (lowerJobId.includes(query)) return true;
        if (cleanQuery.length >= 3 && lowerJobId.replace(/[^a-z0-9]/g, "").includes(cleanQuery)) {
          return true;
        }
      }

      // 4. Effective Job ID extracted from URL or customFields (e.g. JR111568, 101029)
      const effId = getEffectiveJobId(job);
      if (effId) {
        const lowerEffId = effId.toLowerCase();
        if (lowerEffId.includes(query)) return true;
        if (cleanQuery.length >= 3 && lowerEffId.replace(/[^a-z0-9]/g, "").includes(cleanQuery)) {
          return true;
        }
      }

      // 5. Custom fields
      if (job.customFields) {
        for (const val of Object.values(job.customFields)) {
          if (val && val.toLowerCase().includes(query)) return true;
        }
      }

      return false;
    });
  }, [jobs, filterStatus, deferredQuery]);

  // Sorted jobs (defaulting to appliedDate ascending; tie-break preserves insertion order)
  const sortedJobs = useMemo(() => {
    const indexMap = new Map<string, number>();
    filteredJobs.forEach((j, i) => indexMap.set(j.id, i));

    return [...filteredJobs].sort((a, b) => {
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
      if (cmp !== 0) {
        return sortDirection === "asc" ? cmp : -cmp;
      }

      // Tie-breaker when primary sort values are identical:
      // If primary sort is not appliedDate, tie-break by appliedDate first
      if (sortColumn !== "appliedDate") {
        const dateA = a.appliedDate || "";
        const dateB = b.appliedDate || "";
        const dateCmp = dateA.localeCompare(dateB, undefined, { numeric: true, sensitivity: "base" });
        if (dateCmp !== 0) {
          return sortDirection === "asc" ? dateCmp : -dateCmp;
        }
      }

      // Intra-day / same-date tie-breaker: compare createdAt timestamp if available
      if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
        const timeCmp = a.createdAt.localeCompare(b.createdAt);
        return sortDirection === "asc" ? timeCmp : -timeCmp;
      }

      // Fallback tie-breaker: preserve original array index, respecting direction so newest appears first on desc
      const idxA = indexMap.get(a.id) ?? 0;
      const idxB = indexMap.get(b.id) ?? 0;
      return sortDirection === "asc" ? idxA - idxB : idxB - idxA;
    });
  }, [filteredJobs, sortColumn, sortDirection]);

  // Reset visible batch whenever filter, search query, or sort changes
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
  }, [filterStatus, deferredQuery, sortColumn, sortDirection]);

  // Progressive batch loading on scroll near bottom
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => {
            if (prev >= sortedJobs.length) return prev;
            return Math.min(prev + BATCH_SIZE, sortedJobs.length);
          });
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [sortedJobs.length]);

  // Listen for jump-to-bottom requests from quick navigation dock
  useEffect(() => {
    function handleLoadAll() {
      setVisibleCount(sortedJobs.length);
    }
    window.addEventListener("jobtrace_load_all_records", handleLoadAll);
    return () => window.removeEventListener("jobtrace_load_all_records", handleLoadAll);
  }, [sortedJobs.length]);

  // Sliced jobs for smooth, instant 60fps rendering without DOM bloat
  const visibleJobs = useMemo(() => {
    return sortedJobs.slice(0, visibleCount);
  }, [sortedJobs, visibleCount]);

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
      if (
        editingJob ||
        isImportModalOpen ||
        isExportModalOpen ||
        isCleanUpModalOpen ||
        jobToDelete ||
        viewingDetail ||
        selectedRequirementsJob
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Focus Search
      if (key === shortcuts.focusSearch?.toLowerCase()) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // Add Job
      if (key === shortcuts.addJob?.toLowerCase()) {
        e.preventDefault();
        const input = document.getElementById("new-job-company-input");
        if (input) {
          input.focus();
          input.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    shortcuts,
    editingJob,
    isImportModalOpen,
    isExportModalOpen,
    isCleanUpModalOpen,
    jobToDelete,
    viewingDetail,
    selectedRequirementsJob,
  ]);

  function renderCell(job: JobApplication, colId: string) {
    switch (colId) {
      case "company":
        return (
          <td key={colId} className="p-2.5 sm:p-3 font-medium text-zinc-100 max-w-[200px] break-words">
            {job.company}
          </td>
        );
      case "role": {
        return (
          <td key={colId} className="p-2.5 sm:p-3 text-zinc-300 min-w-[180px] max-w-[380px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-zinc-100 break-words">{job.role}</span>
              {extensionSettings?.extractRequirements &&
                extensionSettings?.requirementsDisplay === "drawer" &&
                job.keyRequirements &&
                job.keyRequirements.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRequirementsJob(job);
                    }}
                    title="View Key Requirements"
                    className="text-[10px] font-mono text-[#58a6ff] bg-[#58a6ff]/10 hover:bg-[#58a6ff]/20 border border-[#58a6ff]/30 px-1.5 py-0.5 rounded transition-colors cursor-pointer shrink-0"
                  >
                    {job.keyRequirements.length} reqs
                  </button>
                )}
            </div>
          </td>
        );
      }
      case "keyRequirements": {
        const reqs = job.keyRequirements || [];
        return (
          <td key={colId} className="p-2.5 sm:p-3 whitespace-nowrap">
            {reqs.length === 0 ? (
              <span className="text-zinc-600 text-xs font-mono">—</span>
            ) : (
              <button
                type="button"
                onClick={() => setSelectedRequirementsJob(job)}
                className="text-xs text-[#58a6ff] hover:underline cursor-pointer font-medium"
              >
                {reqs.length} {reqs.length === 1 ? "requirement" : "requirements"}
              </button>
            )}
          </td>
        );
      }
      case "status": {
        const badgeStyle = getStatusBadgeStyle(job.status);
        return (
          <td key={colId} className="p-2.5 sm:p-3 whitespace-nowrap">
            <select
              value={job.status}
              onChange={(e) => onStatusChange(job.id, e.target.value as ApplicationStatus)}
              className={`status-badge-select text-xs font-medium px-2.5 py-1 rounded-full border outline-none cursor-pointer transition-all duration-150 ${badgeStyle}`}
            >
              {allKnownStatuses.map((s) => (
                <option key={s} value={s} className={`font-medium ${getStatusOptionClass(s)}`}>
                  {s}
                </option>
              ))}
            </select>
          </td>
        );
      }
      case "appliedDate":
        return (
          <td key={colId} className="p-2.5 sm:p-3 text-zinc-400 text-xs font-mono whitespace-nowrap">
            {job.appliedDate || <span className="text-zinc-600">—</span>}
          </td>
        );
      case "url": {
        const validUrl = formatUrl(job.url);
        return (
          <td key={colId} className="p-2.5 sm:p-3 whitespace-nowrap">
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
      case "notes": {
        const val = job.notes?.trim();
        if (!val) {
          return (
            <td key={colId} className="p-2.5 sm:p-3 text-xs text-zinc-600 font-mono">
              —
            </td>
          );
        }

        const isLong = val.length > 25 || val.includes("\n");
        return (
          <td key={colId} className="p-2.5 sm:p-3 text-xs max-w-[170px] sm:max-w-[210px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                onClick={() =>
                  setViewingDetail({
                    title: "Notes",
                    company: job.company,
                    role: job.role,
                    content: val,
                    jobId: job.id,
                  })
                }
                className="truncate text-zinc-400 hover:text-[#58a6ff] cursor-pointer transition-colors"
                title="Click to view full note"
              >
                {val}
              </span>
              {isLong && (
                <button
                  type="button"
                  onClick={() =>
                    setViewingDetail({
                      title: "Notes",
                      company: job.company,
                      role: job.role,
                      content: val,
                      jobId: job.id,
                    })
                  }
                  className="text-[11px] text-[#58a6ff] hover:underline font-medium shrink-0 cursor-pointer"
                >
                  see more
                </button>
              )}
            </div>
          </td>
        );
      }
      default: {
        const customField = customFields.find((f) => f.id === colId);
        const val = getFieldValue(job, colId)?.trim();
        if (!val) {
          return (
            <td key={colId} className="p-2.5 sm:p-3 text-xs text-zinc-600 font-mono">
              —
            </td>
          );
        }

        if (customField?.type === "date") {
          return (
            <td key={colId} className="p-2.5 sm:p-3 text-xs text-zinc-400 font-mono whitespace-nowrap">
              {val}
            </td>
          );
        }

        const isLong = val.length > 25 || val.includes("\n");
        return (
          <td key={colId} className="p-2.5 sm:p-3 text-xs max-w-[170px] sm:max-w-[210px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                onClick={
                  isLong
                    ? () =>
                        setViewingDetail({
                          title: customField?.name || colId,
                          company: job.company,
                          role: job.role,
                          content: val,
                          jobId: job.id,
                        })
                    : undefined
                }
                className={`truncate ${
                  isLong
                    ? "text-zinc-400 hover:text-[#58a6ff] cursor-pointer transition-colors"
                    : "text-zinc-300"
                }`}
                title={val}
              >
                {val}
              </span>
              {isLong && (
                <button
                  type="button"
                  onClick={() =>
                    setViewingDetail({
                      title: customField?.name || colId,
                      company: job.company,
                      role: job.role,
                      content: val,
                      jobId: job.id,
                    })
                  }
                  className="text-[11px] text-[#58a6ff] hover:underline font-medium shrink-0 cursor-pointer"
                >
                  see more
                </button>
              )}
            </div>
          </td>
        );
      }
    }
  }

  function renderEmptyContent() {
    const isFiltered = Boolean(searchQuery.trim() || filterStatus !== "All");

    if (jobs.length === 0) {
      return (
        <div className="py-12 px-4 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-zinc-200 mb-1">No applications tracked yet</p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
            Add your first application using the form above, or import an existing CSV file.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById("new-job-company-input");
                input?.focus();
                input?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold transition-colors cursor-pointer"
            >
              + Add Application
            </button>
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-colors cursor-pointer"
            >
              Import CSV
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="py-10 px-4 text-center">
        <div className="w-11 h-11 mx-auto mb-3 rounded-full bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-zinc-200 mb-1">No matching applications</p>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
          {searchQuery.trim()
            ? `No jobs match "${searchQuery}"${filterStatus !== "All" ? ` with status "${filterStatus}"` : ""}.`
            : `No applications currently have status "${filterStatus}".`}
        </p>
        {isFiltered && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setFilterStatus("All");
              searchInputRef.current?.focus();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 text-xs font-medium transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Clear search & filters</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Search & Status Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search company, role, job ID (e.g. JR111568), or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm rounded px-3 pr-9 py-2 outline-none focus:border-zinc-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                title="Clear search"
                aria-label="Clear search"
                className="search-clear-btn absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
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

                <div className="h-px bg-[#30363d]/60 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsActionsOpen(false);
                    setIsCleanUpModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors text-left cursor-pointer"
                >
                  <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <div>
                    <span className="font-medium block">Clean Up Applications</span>
                    <span className="text-[10px] text-zinc-500 block">Bulk delete by status, age, or count</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter Controls: Dropdown or Segmented Pill Bar */}
        {filterStyle === "dropdown" ? (
          <div className="w-full md:w-auto flex items-center">
            <div className="relative w-full md:w-auto">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full md:w-auto bg-[#0d1117] border border-[#30363d] hover:border-[#58a6ff] text-[#f0f6fc] text-xs rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] transition-colors cursor-pointer pr-8 font-medium shadow-inner appearance-none"
              >
                <option value="All" className="bg-[#161b22] text-[#f0f6fc]">
                  All Applications ({statusCounts["All"] || 0})
                </option>
                {allKnownStatuses.map((s) => (
                  <option key={s} value={s} className="bg-[#161b22] text-[#f0f6fc]">
                    {s} ({statusCounts[s] || 0})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#8b949e]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          /* Segmented Status Pill Bar with iOS Sliding Frosted Glass Thumb */
          <div className="w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
            <div
              ref={pillTrackRef}
              className="filter-toggle-track relative inline-flex items-center bg-[#0d1117] border border-[#30363d] rounded-lg p-1 min-w-max shadow-inner gap-0.5 shrink-0"
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
        )}
      </div>

      {/* Mobile View Switcher (Cards vs Table) */}
      <div className="flex sm:hidden items-center justify-between gap-2 mb-3 px-0.5">
        <span className="text-xs text-[#8b949e]">
          {sortedJobs.length} {sortedJobs.length === 1 ? "application" : "applications"}
        </span>
        <div className="flex items-center gap-1 bg-[#0d1117] border border-[#30363d] rounded-lg p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setMobileView("cards")}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              mobileView === "cards"
                ? "bg-[#21262d] text-[#f0f6fc] shadow-xs"
                : "text-[#8b949e] hover:text-[#c9d1d9]"
            }`}
          >
            Cards
          </button>
          <button
            type="button"
            onClick={() => setMobileView("table")}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              mobileView === "table"
                ? "bg-[#21262d] text-[#f0f6fc] shadow-xs"
                : "text-[#8b949e] hover:text-[#c9d1d9]"
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {/* Mobile Cards List: Zero Horizontal Scroll */}
      {(!isMounted || (isMobileScreen && mobileView === "cards")) && (
        <div className="sm:hidden space-y-2.5 mb-4 -mx-1 sm:mx-0">
          {sortedJobs.length === 0 ? (
            <div className="border border-[#30363d] bg-[#161b22]/40 rounded-xl">
              {renderEmptyContent()}
            </div>
          ) : (
            visibleJobs.map((job, index) => {
              const { borderClass } = getRowStatusStyle(job.status);
              const validUrl = formatUrl(job.url);
              return (
                <div
                  key={job.id}
                  className={`p-3.5 rounded-xl border border-[#30363d] bg-[#161b22] space-y-2.5 shadow-sm transition-colors ${borderClass}`}
                >
                  {/* Row 1: Company & Role on left, Status badge & action buttons on right */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {showRowNumbers && (
                          <span className="font-mono text-[10px] text-[#8b949e]">
                            #{index + 1}
                          </span>
                        )}
                        <span className="font-semibold text-sm text-[#f0f6fc] truncate">
                          {job.company}
                        </span>
                        {job.keyRequirements && job.keyRequirements.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedRequirementsJob(job)}
                            className="text-[10px] font-mono text-[#58a6ff] bg-[#58a6ff]/10 border border-[#58a6ff]/30 px-1 rounded shrink-0 cursor-pointer"
                          >
                            {job.keyRequirements.length} reqs
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[#c9d1d9] truncate mt-0.5">
                        {job.role}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <select
                        value={job.status}
                        onChange={(e) => onStatusChange(job.id, e.target.value as ApplicationStatus)}
                        className={`status-badge-select text-[11px] font-medium px-2 py-0.5 rounded-full border outline-none cursor-pointer ${getStatusBadgeStyle(
                          job.status
                        )}`}
                      >
                        {allKnownStatuses.map((s) => (
                          <option key={s} value={s} className={`font-medium ${getStatusOptionClass(s)}`}>
                            {s}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setEditingJob(job)}
                        className="text-[#8b949e] hover:text-[#58a6ff] p-1.5 rounded hover:bg-zinc-800 cursor-pointer"
                        title="Edit application"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => setJobToDelete(job)}
                        className="text-[#8b949e] hover:text-red-400 p-1.5 rounded hover:bg-red-500/10 cursor-pointer"
                        title="Delete application"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Row 2: Metadata bar (Date applied, View Post link, Note snippet) */}
                  <div className="flex items-center justify-between text-[11px] text-[#8b949e] pt-1.5 border-t border-[#30363d]/50 gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono">{job.appliedDate || "—"}</span>
                      {validUrl && (
                        <a
                          href={validUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline inline-flex items-center gap-0.5 font-medium"
                        >
                          View Post ↗
                        </a>
                      )}
                    </div>

                    {job.notes?.trim() && (
                      <button
                        type="button"
                        onClick={() =>
                          setViewingDetail({
                            title: "Notes",
                            company: job.company,
                            role: job.role,
                            content: job.notes,
                            jobId: job.id,
                          })
                        }
                        className="text-[#58a6ff] hover:underline font-medium text-[11px] truncate max-w-[150px] text-right cursor-pointer"
                        title="View full note"
                      >
                        Note: {job.notes}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Table Container */}
      {(!isMounted || !isMobileScreen || mobileView === "table") && (
        <div className={`${mobileView === "cards" ? "hidden sm:block" : "block"} overflow-x-auto rounded-none sm:rounded-xl border-y sm:border border-zinc-800 bg-zinc-900/20 shadow-sm -mx-3 sm:mx-0`}>
          <table className="w-full text-left">
            <thead className="bg-zinc-900/90 text-zinc-400 text-xs uppercase font-medium border-b border-zinc-800">
              <tr className="border-l-2 border-l-transparent">
                <th className={`${showRowNumbers ? "w-11 px-1.5 sm:px-2" : "w-8 p-0"} text-center font-mono text-[11px]`}>
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
                      className={`p-2.5 sm:p-3.5 whitespace-nowrap select-none transition-all duration-150 group/header relative ${
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
                <th className="w-8 sm:w-10 p-0" />
              </tr>
            </thead>
            <tbody>
              {sortedJobs.length === 0 ? (
                <tr>
                  <td
                    colSpan={totalColumnCount}
                    className="p-4"
                  >
                    {renderEmptyContent()}
                  </td>
                </tr>
              ) : (
                visibleJobs.map((job, index) => {
                  const { borderClass, dimClass } = getRowStatusStyle(job.status);
                  return (
                    <tr
                      key={job.id}
                      className={`group border-b border-zinc-800/80 hover:bg-zinc-800/30 ${borderClass} ${dimClass}`}
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

                    {/* Right-edge: Hover Quick Delete on the other end */}
                    <td className="w-8 sm:w-10 px-2 text-right select-none">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setJobToDelete(job);
                        }}
                        title="Delete application"
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-zinc-500 hover:text-red-400 p-1.5 rounded hover:bg-red-500/10 cursor-pointer inline-flex items-center justify-center"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Progressive loading indicator & Sentinel */}
      {sortedJobs.length > INITIAL_BATCH && (
        <div className="flex items-center justify-between text-xs text-[#8b949e] py-3 px-1 border-t border-zinc-800/60 mt-2">
          <span>
            Showing {Math.min(visibleCount, sortedJobs.length)} of {sortedJobs.length} applications
          </span>
          {visibleCount < sortedJobs.length ? (
            <button
              type="button"
              onClick={() => setVisibleCount(sortedJobs.length)}
              className="text-[#58a6ff] hover:underline font-medium cursor-pointer"
            >
              Show all ({sortedJobs.length})
            </button>
          ) : (
            <span className="text-zinc-500">All loaded</span>
          )}
        </div>
      )}
      <div ref={sentinelRef} className="h-4 w-full pointer-events-none" />

      <EditJobModal
        job={editingJob}
        isOpen={!!editingJob}
        onClose={() => setEditingJob(null)}
        onSave={onSaveEdit}
        onDelete={onDeleteJob}
        existingJobs={jobs}
      />

      <SimpleRequirementsDrawer
        job={selectedRequirementsJob}
        isOpen={!!selectedRequirementsJob}
        onClose={() => setSelectedRequirementsJob(null)}
      />

      <NoteDrawer
        item={viewingDetail}
        isOpen={!!viewingDetail}
        onClose={() => setViewingDetail(null)}
        onEdit={(jobId) => {
          const j = jobs.find((x) => x.id === jobId);
          if (j) setEditingJob(j);
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

      <CleanUpModal
        isOpen={isCleanUpModalOpen}
        onClose={() => setIsCleanUpModalOpen(false)}
        jobs={jobs}
        onDeleteJobs={onDeleteJobs}
        onDeleteJob={onDeleteJob}
        statuses={statuses}
      />

      <ConfirmModal
        isOpen={!!jobToDelete}
        onClose={() => setJobToDelete(null)}
        onConfirm={() => {
          if (jobToDelete) {
            onDeleteJob(jobToDelete.id);
            setJobToDelete(null);
          }
        }}
        title="Delete Application"
        message={
          jobToDelete
            ? `Are you sure you want to permanently delete the application for ${jobToDelete.company} (${jobToDelete.role})? This cannot be undone.`
            : ""
        }
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
}
