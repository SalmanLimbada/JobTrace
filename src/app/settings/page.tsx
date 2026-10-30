"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ClearableInput from "@/components/ClearableInput";
import ConfirmModal from "@/components/ConfirmModal";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  useSettings,
  STANDARD_COLUMN_NAMES,
  type StandardColumnsSettings,
  SHORTCUT_LABELS,
  type ShortcutSettings,
  DEFAULT_EXTENSION_TARGET_FIELDS,
} from "@/context/SettingsContext";
import type { CustomFieldType } from "@/types/job";

type SettingsSection =
  | "extension"
  | "display"
  | "columns"
  | "fields"
  | "statuses"
  | "cycles"
  | "shortcuts";

export default function SettingsPage() {
  const { user } = useAuth();
  const {
    showRowNumbers,
    setShowRowNumbers,
    filterStyle,
    setFilterStyle,
    standardColumns,
    toggleStandardColumn,
    customFields,
    addCustomField,
    editCustomField,
    removeCustomField,
    toggleCustomField,
    statuses,
    addStatus,
    editStatus,
    removeStatus,
    reorderStatuses,
    shortcuts,
    updateShortcut,
    resetShortcuts,
    extensionSettings,
    updateExtensionSettings,
    cycles,
    activeCycle,
    setActiveCycle,
    addCycle,
    renameCycle,
    deleteCycle,
    cloudSyncStatus,
    syncToCloud,
  } = useSettings();

  const [activeSection, setActiveSection] = useState<SettingsSection>("extension");

  // Drag and drop state for pipeline statuses
  const [draggedStatus, setDraggedStatus] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [dragOverSide, setDragOverSide] = useState<"above" | "below">("above");

  // Local state for adding items
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>("text");
  const [newStatusName, setNewStatusName] = useState("");
  const [statusError, setStatusError] = useState("");

  // Local state for adding cycles
  const [newCycleName, setNewCycleName] = useState("");
  const [cycleError, setCycleError] = useState("");

  // Editing state for cycles
  const [editingCycle, setEditingCycle] = useState<string | null>(null);
  const [editCycleValue, setEditCycleValue] = useState("");
  const [editCycleError, setEditCycleError] = useState("");

  // Deletion safeguard state for cycles
  const [deleteTargetCycle, setDeleteTargetCycle] = useState<string | null>(null);
  const [deleteCycleJobCount, setDeleteCycleJobCount] = useState<number>(0);
  const [reassignCycle, setReassignCycle] = useState<string>("");
  const [isDeletingCycle, setIsDeletingCycle] = useState<boolean>(false);

  const getJobCountForCycle = async (cycleName: string): Promise<number> => {
    let count = 0;
    try {
      const guestData = localStorage.getItem("job_tracker_guest_jobs");
      if (guestData) {
        const parsed = JSON.parse(guestData);
        for (const id in parsed) {
          if (parsed[id]?.cycle === cycleName) count++;
        }
      }
    } catch {}

    if (!user) return count;

    try {
      const cached = localStorage.getItem("jobtrace_cached_applications");
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.filter((j: any) => j.cycle === cycleName || j.customFields?.cycle === cycleName).length;
      }
    } catch {}

    return count;
  };

  const handleAddCycle = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCycleName.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === "all") {
      setCycleError("'All' is reserved");
      return;
    }
    if (cycles.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setCycleError("This cycle already exists");
      return;
    }
    const success = addCycle(trimmed);
    if (success) {
      setNewCycleName("");
      setCycleError("");
    } else {
      setCycleError("Could not add cycle");
    }
  };

  const handleStartEditCycle = (name: string) => {
    setEditingCycle(name);
    setEditCycleValue(name);
    setEditCycleError("");
  };

  const handleSaveEditCycle = (oldName: string) => {
    const trimmed = editCycleValue.trim();
    if (!trimmed) {
      setEditCycleError("Cycle name cannot be empty");
      return;
    }
    if (trimmed.toLowerCase() === "all") {
      setEditCycleError("'All' is reserved");
      return;
    }
    if (trimmed === oldName) {
      setEditingCycle(null);
      setEditCycleError("");
      return;
    }
    const exists = cycles.some(
      (c) => c.toLowerCase() !== oldName.toLowerCase() && c.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setEditCycleError("This cycle already exists");
      return;
    }
    const success = renameCycle(oldName, trimmed);
    if (!success) {
      setEditCycleError("Could not update cycle");
      return;
    }
    setEditingCycle(null);
    setEditCycleError("");
  };

  const handleInitiateDeleteCycle = async (cycleName: string) => {
    const count = await getJobCountForCycle(cycleName);
    setDeleteTargetCycle(cycleName);
    setDeleteCycleJobCount(count);
    const remaining = cycles.filter((c) => c !== cycleName);
    setReassignCycle(remaining[0] || "");
  };

  const handleConfirmDeleteCycle = async () => {
    if (!deleteTargetCycle) return;
    setIsDeletingCycle(true);
    try {
      deleteCycle(deleteTargetCycle, reassignCycle || undefined);
      setDeleteTargetCycle(null);
      setDeleteCycleJobCount(0);
    } finally {
      setIsDeletingCycle(false);
    }
  };

  // Editing state for statuses
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [editStatusValue, setEditStatusValue] = useState("");
  const [editStatusError, setEditStatusError] = useState("");

  // Editing state for custom fields
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldName, setEditFieldName] = useState("");
  const [editFieldError, setEditFieldError] = useState("");

  const handleStartEditStatus = (name: string) => {
    setEditingStatus(name);
    setEditStatusValue(name);
    setEditStatusError("");
  };

  const handleSaveEditStatus = (oldName: string) => {
    const trimmed = editStatusValue.trim();
    if (!trimmed) {
      setEditStatusError("Status name cannot be empty");
      return;
    }
    if (trimmed === oldName) {
      setEditingStatus(null);
      setEditStatusError("");
      return;
    }
    const exists = statuses.some(
      (s) => s.toLowerCase() !== oldName.toLowerCase() && s.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setEditStatusError("This status already exists");
      return;
    }
    const success = editStatus(oldName, trimmed);
    if (!success) {
      setEditStatusError("Could not update status");
      return;
    }
    setEditingStatus(null);
    setEditStatusError("");
  };

  const handleCancelEditStatus = () => {
    setEditingStatus(null);
    setEditStatusValue("");
    setEditStatusError("");
  };

  const handleStartEditField = (field: { id: string; name: string }) => {
    setEditingFieldId(field.id);
    setEditFieldName(field.name);
    setEditFieldError("");
  };

  const handleSaveEditField = (id: string) => {
    const trimmed = editFieldName.trim();
    if (!trimmed) {
      setEditFieldError("Field name cannot be empty");
      return;
    }
    const current = customFields.find((f) => f.id === id);
    if (current && trimmed === current.name) {
      setEditingFieldId(null);
      setEditFieldError("");
      return;
    }
    const exists = customFields.some(
      (f) => f.id !== id && f.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setEditFieldError("A field with this name already exists");
      return;
    }
    const success = editCustomField(id, trimmed);
    if (!success) {
      setEditFieldError("Could not update field name");
      return;
    }
    setEditingFieldId(null);
    setEditFieldError("");
  };

  const handleCancelEditField = () => {
    setEditingFieldId(null);
    setEditFieldName("");
    setEditFieldError("");
  };

  // Deletion safeguard state for statuses
  const [deleteTargetStatus, setDeleteTargetStatus] = useState<string | null>(null);
  const [deleteStatusJobCount, setDeleteStatusJobCount] = useState<number>(0);
  const [reassignStatus, setReassignStatus] = useState<string>("");
  const [isDeletingWithSafeguard, setIsDeletingWithSafeguard] = useState<boolean>(false);

  const getJobCountForStatus = async (statusName: string): Promise<number> => {
    let count = 0;
    try {
      const guestData = localStorage.getItem("job_tracker_guest_jobs");
      if (guestData) {
        const parsed = JSON.parse(guestData);
        for (const id in parsed) {
          if (parsed[id]?.status === statusName) count++;
        }
      }
    } catch {}

    if (!user) return count;

    try {
      const { count: dbCount, error } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("status", statusName)
        .eq("user_id", user.id);
      if (!error && typeof dbCount === "number") {
        return dbCount;
      }
    } catch {}

    try {
      const cached = localStorage.getItem("jobtrace_cached_applications");
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.filter((j: any) => j.status === statusName).length;
      }
    } catch {}

    return count;
  };

  const handleInitiateDeleteStatus = async (statusName: string) => {
    if (statuses.length <= 1) {
      setStatusError("You must keep at least one status");
      return;
    }
    const count = await getJobCountForStatus(statusName);
    setDeleteTargetStatus(statusName);
    setDeleteStatusJobCount(count);
    const remaining = statuses.filter((s) => s !== statusName);
    setReassignStatus(remaining[0] || "");
  };

  const handleConfirmDeleteStatus = async () => {
    if (!deleteTargetStatus) return;
    setIsDeletingWithSafeguard(true);
    try {
      if (deleteStatusJobCount > 0 && reassignStatus) {
        // 1. Migrate applications in guest localStorage
        try {
          const guestKey = "job_tracker_guest_jobs";
          const guestData = localStorage.getItem(guestKey);
          if (guestData) {
            const parsed = JSON.parse(guestData);
            let changed = false;
            for (const id in parsed) {
              if (parsed[id]?.status === deleteTargetStatus) {
                parsed[id].status = reassignStatus;
                changed = true;
              }
            }
            if (changed) {
              localStorage.setItem(guestKey, JSON.stringify(parsed));
            }
          }
        } catch {}

        // 2. Migrate in Supabase
        if (user) {
          try {
            await supabase
              .from("applications")
              .update({ status: reassignStatus })
              .eq("status", deleteTargetStatus)
              .eq("user_id", user.id);
          } catch (err) {
            console.error("Failed to reassign applications in database:", err);
          }
        }

        // 3. Dispatch event so active pages update immediately
        try {
          window.dispatchEvent(
            new CustomEvent("jobtrace_status_renamed", {
              detail: { oldStatus: deleteTargetStatus, newStatus: reassignStatus },
            })
          );
        } catch {}
      }

      removeStatus(deleteTargetStatus);
      setDeleteTargetStatus(null);
      setDeleteStatusJobCount(0);
    } finally {
      setIsDeletingWithSafeguard(false);
    }
  };

  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;
    addCustomField(newFieldName.trim(), newFieldType);
    setNewFieldName("");
  };

  const handleAddStatus = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newStatusName.trim();
    if (!trimmed) return;
    if (statuses.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setStatusError("This status already exists");
      return;
    }
    addStatus(trimmed);
    setNewStatusName("");
    setStatusError("");
  };

  const isSalaryEnabled = customFields.find((f) => f.id === "salary")?.enabled ?? true;
  const isLocationEnabled = customFields.find((f) => f.id === "location")?.enabled ?? true;
  const isUrlEnabled = standardColumns.url ?? true;

  const unifiedScraperFields = [
    {
      id: "salary",
      label: "Salary",
      desc: "Show in table and scrape compensation ranges",
      checked: isSalaryEnabled,
      onToggle: () => toggleCustomField("salary"),
    },
    {
      id: "location",
      label: "Location",
      desc: "Show in table and scrape city / remote status",
      checked: isLocationEnabled,
      onToggle: () => toggleCustomField("location"),
    },
    {
      id: "url",
      label: "Posting URL",
      desc: "Show in table and save application links",
      checked: isUrlEnabled,
      onToggle: () => toggleStandardColumn("url"),
    },
    {
      id: "keyRequirements",
      label: "Key Requirements",
      desc: "Parse qualification bullets into tracker",
      checked: extensionSettings.extractRequirements,
      onToggle: () =>
        updateExtensionSettings({ extractRequirements: !extensionSettings.extractRequirements }),
    },
  ];

  const SECTIONS: { id: SettingsSection; label: string; desc: string }[] = [
    {
      id: "extension",
      label: "Chrome Extension",
      desc: "Extraction & requirement display",
    },
    {
      id: "display",
      label: "Appearance",
      desc: "Theme and table numbering",
    },
    {
      id: "columns",
      label: "Table Columns",
      desc: "Visibility of default fields",
    },
    {
      id: "fields",
      label: "Custom Fields",
      desc: "User-defined data columns",
    },
    {
      id: "statuses",
      label: "Application Statuses",
      desc: "Application stages and order",
    },
    {
      id: "cycles",
      label: "Recruiting Cycles",
      desc: "Season & cohort tracking",
    },
    {
      id: "shortcuts",
      label: "Shortcuts",
      desc: "Keyboard navigation keys",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex flex-col font-sans">
      <Navbar />

      <main className="p-3.5 sm:p-8 max-w-7xl mx-auto w-full flex-1">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f0f6fc]">
              Settings
            </h1>
            <p className="text-xs text-[#8b949e] mt-0.5">
              Manage extension scraping, appearance, columns, and preferences
            </p>
          </div>

          {/* Cloud Sync Status */}
          <div className="flex items-center gap-2">
            {user ? (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border border-[#30363d] bg-[#161b22] text-[#8b949e]"
                title={`All preferences synced with ${user.email}`}
              >
                <span className="text-[11px] text-[#c9d1d9] font-medium">
                  {cloudSyncStatus === "syncing" ? "Syncing..." : "Cloud synced"}
                </span>
                <span className="text-[10px] text-[#8b949e] hidden sm:inline max-w-[160px] truncate">
                  ({user.email})
                </span>
              </div>
            ) : (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border border-[#30363d] bg-[#161b22] text-[#8b949e]"
                title="Sign in to sync your preferences across devices"
              >
                <span className="text-[11px] text-[#8b949e]">
                  Local only
                </span>
                <Link
                  href="/login"
                  className="text-[11px] text-[#58a6ff] hover:underline ml-1"
                >
                  Sign in to sync
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Layout: Sidebar + Settings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* Navigation Sidebar: Horizontal swipeable tabs on mobile, vertical sidebar on desktop */}
          <aside className="md:col-span-4 lg:col-span-3 flex md:flex-col overflow-x-auto no-scrollbar gap-1 border border-[#30363d] bg-[#161b22] p-1.5 rounded-lg shrink-0 -mx-1 px-1 sm:mx-0 sm:px-1.5">
            {SECTIONS.map((sec) => {
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className={`flex flex-col items-start px-3 py-1.5 md:py-2 rounded-md text-left transition-colors cursor-pointer shrink-0 whitespace-nowrap md:whitespace-normal ${
                    isActive
                      ? "bg-[#21262d] text-[#f0f6fc] font-medium"
                      : "text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]/40"
                  }`}
                >
                  <span className="text-xs font-medium">{sec.label}</span>
                  <span className="text-[11px] text-[#8b949e] opacity-80 truncate max-w-full hidden md:inline">
                    {sec.desc}
                  </span>
                </button>
              );
            })}
          </aside>

          {/* Settings Section Body */}
          <div className="md:col-span-8 lg:col-span-9 space-y-6">
            {/* 1. EXTENSION SECTION */}
            {activeSection === "extension" && (
              <div className="border border-[#30363d] bg-[#161b22] rounded-lg overflow-hidden divide-y divide-[#30363d]">
                <div className="px-5 py-4">
                  <h2 className="text-sm font-semibold text-[#f0f6fc]">
                    Chrome Extension
                  </h2>
                  <p className="text-xs text-[#8b949e] mt-0.5">
                    Configure scraping defaults and target extraction fields.
                  </p>
                </div>

                {/* Extraction Toggle */}
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-[#f0f6fc] block">
                      Extract key requirements
                    </span>
                    <p className="text-xs text-[#8b949e] leading-relaxed">
                      Parse qualification and requirement bullets from the job posting.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={extensionSettings.extractRequirements}
                    onChange={(e) =>
                      updateExtensionSettings({ extractRequirements: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 accent-[#58a6ff] cursor-pointer"
                  />
                </div>

                {/* Destination Choice */}
                {extensionSettings.extractRequirements && (
                  <div className="p-5 space-y-3">
                    <label className="text-xs font-medium text-[#f0f6fc] block">
                      Requirements Display
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`flex items-start gap-3 p-3.5 rounded-md border cursor-pointer transition-colors ${
                          extensionSettings.requirementsDisplay === "drawer"
                            ? "bg-[#21262d] border-[#58a6ff] text-[#f0f6fc]"
                            : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="requirementsDisplay"
                          value="drawer"
                          checked={extensionSettings.requirementsDisplay === "drawer"}
                          onChange={() =>
                            updateExtensionSettings({ requirementsDisplay: "drawer" })
                          }
                          className="mt-0.5 accent-[#58a6ff]"
                        />
                        <div>
                          <span className="text-xs font-medium text-[#f0f6fc] block">
                            Side Panel (Drawer)
                          </span>
                          <span className="text-[11px] text-[#8b949e] leading-relaxed block mt-0.5">
                            Clicking requirements badge opens a right slide-out panel.
                          </span>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-3 p-3.5 rounded-md border cursor-pointer transition-colors ${
                          extensionSettings.requirementsDisplay === "column"
                            ? "bg-[#21262d] border-[#58a6ff] text-[#f0f6fc]"
                            : "bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="requirementsDisplay"
                          value="column"
                          checked={extensionSettings.requirementsDisplay === "column"}
                          onChange={() =>
                            updateExtensionSettings({ requirementsDisplay: "column" })
                          }
                          className="mt-0.5 accent-[#58a6ff]"
                        />
                        <div>
                          <span className="text-xs font-medium text-[#f0f6fc] block">
                            Table Column
                          </span>
                          <span className="text-[11px] text-[#8b949e] leading-relaxed block mt-0.5">
                            Shows requirements directly as a column in the tracker table.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Unified Scraper & Table Fields */}
                <div className="p-5 space-y-3">
                  <div>
                    <span className="text-xs font-medium text-[#f0f6fc] block">
                      Tracked Fields & Scraper
                    </span>
                    <p className="text-xs text-[#8b949e] mt-0.5">
                      Changing a field here immediately toggles it for both your dashboard table columns and the extension scraper.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {unifiedScraperFields.map((field) => (
                      <label
                        key={field.id}
                        className="flex items-start justify-between p-3 rounded-md border border-[#30363d] bg-[#0d1117] hover:border-[#58a6ff]/40 transition-colors cursor-pointer gap-2"
                      >
                        <div>
                          <span className="text-xs text-[#f0f6fc] font-medium block">
                            {field.label}
                          </span>
                          <span className="text-[11px] text-[#8b949e] block mt-0.5">
                            {field.desc}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={field.checked}
                          onChange={field.onToggle}
                          className="w-4 h-4 accent-[#58a6ff] cursor-pointer mt-0.5 shrink-0"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="px-5 py-3 flex items-center justify-between text-xs text-[#8b949e]">
                  <span>How to install unpacked</span>
                  <Link
                    href="/extension"
                    className="text-[#58a6ff] hover:underline font-medium"
                  >
                    Installation guide →
                  </Link>
                </div>
              </div>
            )}

            {/* 2. DISPLAY & FILTERS SECTION */}
            {activeSection === "display" && (
              <div className="border border-[#30363d] bg-[#161b22] rounded-lg overflow-hidden divide-y divide-[#30363d]">
                <div className="px-5 py-4">
                  <h2 className="text-sm font-semibold text-[#f0f6fc]">Display & Filters</h2>
                  <p className="text-xs text-[#8b949e] mt-0.5">
                    Customize your table layout, filter format, and line numbering.
                  </p>
                </div>

                {/* Status Filter Style */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-medium text-[#f0f6fc] block">Status Filter Style</span>
                    <span className="text-xs text-[#8b949e]">
                      Choose between segmented pill buttons and a clean dropdown menu in the toolbar.
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 p-0.5 bg-[#0d1117] border border-[#30363d] rounded-md shrink-0">
                    <button
                      type="button"
                      onClick={() => setFilterStyle("pills")}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                        filterStyle === "pills"
                          ? "bg-[#21262d] text-[#f0f6fc] font-semibold"
                          : "text-[#8b949e] hover:text-[#c9d1d9]"
                      }`}
                    >
                      Segmented Pills
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStyle("dropdown")}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                        filterStyle === "dropdown"
                          ? "bg-[#21262d] text-[#f0f6fc] font-semibold"
                          : "text-[#8b949e] hover:text-[#c9d1d9]"
                      }`}
                    >
                      Simple Dropdown
                    </button>
                  </div>
                </div>

                {/* Row Numbers Toggle */}
                <div className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-medium text-[#f0f6fc] block">Row Numbers</span>
                    <span className="text-xs text-[#8b949e]">
                      Show incremental line numbering on the left edge of table rows.
                    </span>
                  </div>

                  <input
                    type="checkbox"
                    checked={showRowNumbers}
                    onChange={(e) => setShowRowNumbers(e.target.checked)}
                    className="w-4 h-4 accent-[#58a6ff] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 3. TABLE COLUMNS SECTION */}
            {activeSection === "columns" && (
              <div className="border border-[#30363d] bg-[#161b22] rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-[#30363d]">
                  <h2 className="text-sm font-semibold text-[#f0f6fc]">Standard Columns</h2>
                  <p className="text-xs text-[#8b949e] mt-0.5">
                    Toggle which built-in columns are visible in the main application table.
                  </p>
                </div>

                <div className="p-5 space-y-2">
                  {(Object.keys(STANDARD_COLUMN_NAMES) as Array<keyof StandardColumnsSettings>).map(
                    (colKey) => (
                      <label
                        key={colKey}
                        className="flex items-center justify-between p-3 rounded-md border border-[#30363d] bg-[#0d1117] hover:border-[#58a6ff]/40 transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-medium text-[#f0f6fc]">
                          {STANDARD_COLUMN_NAMES[colKey]}
                        </span>
                        <input
                          type="checkbox"
                          checked={standardColumns[colKey]}
                          onChange={() => toggleStandardColumn(colKey)}
                          className="w-4 h-4 accent-[#58a6ff] cursor-pointer"
                        />
                      </label>
                    )
                  )}
                </div>
              </div>
            )}

            {/* 4. CUSTOM FIELDS SECTION */}
            {activeSection === "fields" && (
              <div className="border border-[#30363d] bg-[#161b22] rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-[#30363d]">
                  <h2 className="text-sm font-semibold text-[#f0f6fc]">Custom Fields</h2>
                  <p className="text-xs text-[#8b949e] mt-0.5">
                    Define custom columns (e.g. Salary, Location, Next Round, Referral).
                  </p>
                </div>

                <div className="p-5 space-y-4">
                  {/* Add Field Form */}
                  <form
                    onSubmit={handleAddCustomField}
                    className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
                  >
                    <ClearableInput
                      type="text"
                      placeholder="Field name (e.g. Recruiter Contact)"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] text-xs text-[#f0f6fc] placeholder-[#8b949e] rounded-md px-3 py-2 outline-none focus:border-[#58a6ff]"
                      containerClassName="flex-1"
                    />
                    <select
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
                      className="bg-[#0d1117] border border-[#30363d] text-xs text-[#f0f6fc] rounded-md px-3 py-2 outline-none focus:border-[#58a6ff] cursor-pointer"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                    </select>
                    <button
                      type="submit"
                      disabled={!newFieldName.trim()}
                      className="px-3.5 py-2 text-xs font-medium bg-[#238636] hover:bg-[#2ea043] disabled:opacity-40 text-white rounded-md transition-colors cursor-pointer shrink-0"
                    >
                      Add Field
                    </button>
                  </form>

                  {/* List of Custom Fields */}
                  <div className="space-y-1.5 pt-2">
                    {customFields.map((field) => {
                      const isEditing = editingFieldId === field.id;

                      return (
                        <div
                          key={field.id}
                          className="flex items-center justify-between p-2.5 rounded-md border border-[#30363d] bg-[#0d1117] gap-3"
                        >
                          {isEditing ? (
                            <div className="flex-1 flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <ClearableInput
                                  type="text"
                                  value={editFieldName}
                                  onChange={(e) => {
                                    setEditFieldName(e.target.value);
                                    if (editFieldError) setEditFieldError("");
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleSaveEditField(field.id);
                                    } else if (e.key === "Escape") {
                                      handleCancelEditField();
                                    }
                                  }}
                                  placeholder="Field name"
                                  autoFocus
                                  className="w-full bg-[#161b22] border border-[#58a6ff] text-xs text-[#f0f6fc] rounded px-2.5 py-1 outline-none"
                                  containerClassName="flex-1 max-w-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditField(field.id)}
                                  className="px-2.5 py-1 text-xs font-medium bg-[#238636] hover:bg-[#2ea043] text-white rounded transition-colors cursor-pointer shrink-0"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditField}
                                  className="px-2.5 py-1 text-xs text-[#8b949e] hover:text-[#c9d1d9] rounded transition-colors cursor-pointer shrink-0"
                                >
                                  Cancel
                                </button>
                              </div>
                              {editFieldError && (
                                <p className="text-[11px] text-[#f85149]">{editFieldError}</p>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={field.enabled}
                                  onChange={() => toggleCustomField(field.id)}
                                  className="w-4 h-4 accent-[#58a6ff] cursor-pointer"
                                />
                                <span className="text-xs font-medium text-[#f0f6fc]">{field.name}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#161b22] text-[#8b949e] border border-[#30363d] uppercase">
                                  {field.type}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditField(field)}
                                  className="text-xs text-[#8b949e] hover:text-[#58a6ff] px-2 py-1 rounded transition-colors cursor-pointer"
                                  title="Rename field"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeCustomField(field.id)}
                                  className="text-xs text-[#8b949e] hover:text-[#f85149] px-2 py-1 rounded transition-colors cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 5. STATUSES SECTION */}
            {activeSection === "statuses" && (
              <div className="border border-[#30363d] bg-[#161b22] rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-[#30363d]">
                  <h2 className="text-sm font-semibold text-[#f0f6fc]">Application Statuses</h2>
                  <p className="text-xs text-[#8b949e] mt-0.5">
                    Order and manage the tracking stages used in your dashboard.
                  </p>
                </div>

                <div className="p-5 space-y-4">
                  {/* Add Status Form */}
                  <form onSubmit={handleAddStatus} className="flex gap-2">
                    <ClearableInput
                      type="text"
                      placeholder="Status name (e.g. Assessment, Phone Screen)..."
                      value={newStatusName}
                      onChange={(e) => {
                        setNewStatusName(e.target.value);
                        if (statusError) setStatusError("");
                      }}
                      className="w-full bg-[#0d1117] border border-[#30363d] text-xs text-[#f0f6fc] placeholder-[#8b949e] rounded-md px-3 py-2 outline-none focus:border-[#58a6ff]"
                      containerClassName="flex-1"
                    />
                    <button
                      type="submit"
                      disabled={!newStatusName.trim()}
                      className="px-3.5 py-2 text-xs font-medium bg-[#238636] hover:bg-[#2ea043] disabled:opacity-40 text-white rounded-md transition-colors cursor-pointer shrink-0"
                    >
                      Add Status
                    </button>
                  </form>

                  {statusError && <p className="text-xs text-[#f85149]">{statusError}</p>}

                  {/* List of Statuses with 6-dots Drag Handle */}
                  <div className="space-y-1.5 pt-1">
                    {statuses.map((statusName, idx) => {
                      const isEditing = editingStatus === statusName;
                      const isDragged = draggedStatus === statusName;
                      const isOver = dragOverStatus === statusName && !isDragged;

                      return (
                        <div
                          key={statusName}
                          draggable={!isEditing}
                          onDragStart={(e) => {
                            if (isEditing) return;
                            setDraggedStatus(statusName);
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", statusName);
                          }}
                          onDragOver={(e) => {
                            if (isEditing) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (draggedStatus && draggedStatus !== statusName) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const midpoint = rect.top + rect.height / 2;
                              const side = e.clientY < midpoint ? "above" : "below";
                              setDragOverStatus(statusName);
                              setDragOverSide(side);
                            }
                          }}
                          onDragLeave={(e) => {
                            if (e.currentTarget === e.target) {
                              setDragOverStatus(null);
                            }
                          }}
                          onDrop={(e) => {
                            if (isEditing) return;
                            e.preventDefault();
                            const source = draggedStatus || e.dataTransfer.getData("text/plain");
                            if (source && source !== statusName) {
                              reorderStatuses(source, statusName, dragOverSide);
                            }
                            setDraggedStatus(null);
                            setDragOverStatus(null);
                          }}
                          onDragEnd={() => {
                            setDraggedStatus(null);
                            setDragOverStatus(null);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-md border bg-[#0d1117] transition-all duration-150 relative gap-3 ${
                            isDragged
                              ? "opacity-30 border-dashed border-[#58a6ff]"
                              : isOver && dragOverSide === "above"
                              ? "border-[#30363d] border-t-2 border-t-[#58a6ff]"
                              : isOver && dragOverSide === "below"
                              ? "border-[#30363d] border-b-2 border-b-[#58a6ff]"
                              : "border-[#30363d]"
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex-1 flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-[#8b949e] w-4">{idx + 1}</span>
                                <ClearableInput
                                  type="text"
                                  value={editStatusValue}
                                  onChange={(e) => {
                                    setEditStatusValue(e.target.value);
                                    if (editStatusError) setEditStatusError("");
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleSaveEditStatus(statusName);
                                    } else if (e.key === "Escape") {
                                      handleCancelEditStatus();
                                    }
                                  }}
                                  placeholder="Status name"
                                  autoFocus
                                  className="w-full bg-[#161b22] border border-[#58a6ff] text-xs text-[#f0f6fc] rounded px-2.5 py-1 outline-none"
                                  containerClassName="flex-1 max-w-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditStatus(statusName)}
                                  className="px-2.5 py-1 text-xs font-medium bg-[#238636] hover:bg-[#2ea043] text-white rounded transition-colors cursor-pointer shrink-0"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditStatus}
                                  className="px-2.5 py-1 text-xs text-[#8b949e] hover:text-[#c9d1d9] rounded transition-colors cursor-pointer shrink-0"
                                >
                                  Cancel
                                </button>
                              </div>
                              {editStatusError && (
                                <p className="text-[11px] text-[#f85149] ml-6">{editStatusError}</p>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                {/* 6-dots drag handle */}
                                <div
                                  className="text-[#8b949e] hover:text-[#c9d1d9] cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-[#21262d] transition-colors"
                                  title="Drag to reorder"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="9" cy="6" r="1.5" />
                                    <circle cx="15" cy="6" r="1.5" />
                                    <circle cx="9" cy="12" r="1.5" />
                                    <circle cx="15" cy="12" r="1.5" />
                                    <circle cx="9" cy="18" r="1.5" />
                                    <circle cx="15" cy="18" r="1.5" />
                                  </svg>
                                </div>
                                <span className="text-xs font-mono text-[#8b949e] w-4">{idx + 1}</span>
                                <span className="text-xs font-medium text-[#f0f6fc]">{statusName}</span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditStatus(statusName)}
                                  className="text-xs text-[#8b949e] hover:text-[#58a6ff] px-2 py-1 rounded transition-colors cursor-pointer"
                                  title="Rename status"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInitiateDeleteStatus(statusName)}
                                  className="text-xs text-[#8b949e] hover:text-[#f85149] px-2 py-1 rounded transition-colors cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 6. CYCLES SECTION */}
            {activeSection === "cycles" && (
              <div className="border border-[#30363d] bg-[#161b22] rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-[#30363d]">
                  <h2 className="text-sm font-semibold text-[#f0f6fc]">Recruiting Cycles</h2>
                  <p className="text-xs text-[#8b949e] mt-0.5">
                    Organize job applications into cohorts (e.g. &ldquo;Summer 2026&rdquo;, &ldquo;New Grad 2025&rdquo;). Setting an active cycle auto-tags newly added applications. You can deactivate it anytime to leave new applications untagged.
                  </p>
                </div>

                <div className="p-5 space-y-4">
                  {/* Add Cycle Form */}
                  <form onSubmit={handleAddCycle} className="flex gap-2">
                    <ClearableInput
                      type="text"
                      placeholder="Cycle name (e.g. Summer 2026, Full-Time 2025)..."
                      value={newCycleName}
                      onChange={(e) => {
                        setNewCycleName(e.target.value);
                        if (cycleError) setCycleError("");
                      }}
                      className="w-full bg-[#0d1117] border border-[#30363d] text-xs text-[#f0f6fc] placeholder-[#8b949e] rounded-md px-3 py-2 outline-none focus:border-[#58a6ff]"
                      containerClassName="flex-1"
                    />
                    <button
                      type="submit"
                      disabled={!newCycleName.trim()}
                      className="px-3.5 py-2 text-xs font-medium bg-[#238636] hover:bg-[#2ea043] disabled:opacity-40 text-white rounded-md transition-colors cursor-pointer shrink-0"
                    >
                      Add Cycle
                    </button>
                  </form>

                  {cycleError && <p className="text-xs text-[#f85149]">{cycleError}</p>}

                  {/* List of Cycles */}
                  <div className="space-y-1.5 pt-1">
                    {cycles.length === 0 ? (
                      <div className="p-4 rounded-md border border-dashed border-[#30363d] text-center text-xs text-[#8b949e]">
                        No custom cycles yet. Create your first recruiting season above!
                      </div>
                    ) : (
                      cycles.map((cycleName) => {
                        const isEditing = editingCycle === cycleName;
                        const isActive = activeCycle === cycleName;

                        return (
                          <div
                            key={cycleName}
                            className={`flex items-center justify-between p-2.5 rounded-md border bg-[#0d1117] transition-all gap-3 ${
                              isActive ? "border-[#58a6ff]/40 bg-[#161b22]" : "border-[#30363d]"
                            }`}
                          >
                            {isEditing ? (
                              <div className="flex-1 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <ClearableInput
                                    type="text"
                                    value={editCycleValue}
                                    onChange={(e) => {
                                      setEditCycleValue(e.target.value);
                                      if (editCycleError) setEditCycleError("");
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleSaveEditCycle(cycleName);
                                      } else if (e.key === "Escape") {
                                        setEditingCycle(null);
                                      }
                                    }}
                                    placeholder="Cycle name"
                                    autoFocus
                                    className="w-full bg-[#161b22] border border-[#58a6ff] text-xs text-[#f0f6fc] rounded px-2.5 py-1 outline-none"
                                    containerClassName="flex-1 max-w-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditCycle(cycleName)}
                                    className="px-2.5 py-1 text-xs font-medium bg-[#238636] hover:bg-[#2ea043] text-white rounded transition-colors cursor-pointer shrink-0"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingCycle(null)}
                                    className="px-2.5 py-1 text-xs text-[#8b949e] hover:text-[#c9d1d9] rounded transition-colors cursor-pointer shrink-0"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                {editCycleError && (
                                  <p className="text-[11px] text-[#f85149]">{editCycleError}</p>
                                )}
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <svg className="w-3.5 h-3.5 text-[#58a6ff] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  <span className="text-xs font-medium text-[#f0f6fc] truncate">{cycleName}</span>
                                  {isActive && (
                                    <span className="text-[10px] font-semibold text-[#58a6ff] bg-[#58a6ff]/10 border border-[#58a6ff]/30 px-1.5 py-0.5 rounded-full">
                                      Active Cycle
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {isActive ? (
                                    <button
                                      type="button"
                                      onClick={() => setActiveCycle("All")}
                                      className="text-xs text-[#8b949e] hover:text-[#f85149] px-2 py-1 rounded transition-colors cursor-pointer"
                                      title="Deactivate this cycle (leaves new applications untagged)"
                                    >
                                      Deactivate
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setActiveCycle(cycleName)}
                                      className="text-xs text-[#8b949e] hover:text-[#58a6ff] px-2 py-1 rounded transition-colors cursor-pointer"
                                    >
                                      Make Active
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditCycle(cycleName)}
                                    className="text-xs text-[#8b949e] hover:text-[#58a6ff] px-2 py-1 rounded transition-colors cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleInitiateDeleteCycle(cycleName)}
                                    className="text-xs text-[#8b949e] hover:text-[#f85149] px-2 py-1 rounded transition-colors cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 7. SHORTCUTS SECTION */}
            {activeSection === "shortcuts" && (
              <div className="border border-[#30363d] bg-[#161b22] rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-[#f0f6fc]">Keyboard Shortcuts</h2>
                    <p className="text-xs text-[#8b949e] mt-0.5">
                      Keyboard triggers to navigate and perform actions quickly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetShortcuts}
                    className="text-xs text-[#58a6ff] hover:underline cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                </div>

                <div className="p-5 space-y-2">
                  {(Object.keys(SHORTCUT_LABELS) as Array<keyof ShortcutSettings>).map((actionKey) => (
                    <div
                      key={actionKey}
                      className="flex items-center justify-between p-3 rounded-md border border-[#30363d] bg-[#0d1117]"
                    >
                      <div>
                        <span className="text-xs font-medium text-[#f0f6fc] block">
                          {SHORTCUT_LABELS[actionKey].label}
                        </span>
                        <span className="text-[11px] text-[#8b949e]">
                          {SHORTCUT_LABELS[actionKey].desc}
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={1}
                        value={shortcuts[actionKey]}
                        onChange={(e) => updateShortcut(actionKey, e.target.value.toLowerCase())}
                        className="w-10 text-center font-mono text-xs bg-[#161b22] border border-[#30363d] rounded px-2 py-1 text-[#58a6ff] outline-none focus:border-[#58a6ff]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Deletion Safeguard Modal for Statuses */}
      {deleteTargetStatus && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-100"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingWithSafeguard) {
              setDeleteTargetStatus(null);
            }
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-[#30363d] bg-[#161b22] shadow-2xl p-5 flex flex-col gap-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  deleteStatusJobCount > 0
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}
              >
                {deleteStatusJobCount > 0 ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[#f0f6fc] leading-snug">
                  Delete &ldquo;{deleteTargetStatus}&rdquo; status?
                </h3>
                {deleteStatusJobCount > 0 ? (
                  <p className="mt-1 text-xs text-[#8b949e] leading-relaxed">
                    You currently have{" "}
                    <span className="font-semibold text-amber-300 font-mono">
                      {deleteStatusJobCount} {deleteStatusJobCount === 1 ? "application" : "applications"}
                    </span>{" "}
                    using this status. Choose which status to reassign them to so your records remain intact.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-[#8b949e] leading-relaxed">
                    No applications currently use this status. Are you sure you want to remove it?
                  </p>
                )}
              </div>
            </div>

            {deleteStatusJobCount > 0 && (
              <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-2">
                <label className="block text-[11px] font-medium text-[#c9d1d9]">
                  Reassign existing applications to:
                </label>
                <select
                  value={reassignStatus}
                  onChange={(e) => setReassignStatus(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] text-xs text-[#f0f6fc] rounded-md px-3 py-2 outline-none focus:border-[#58a6ff] cursor-pointer"
                >
                  {statuses
                    .filter((s) => s !== deleteTargetStatus)
                    .map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#30363d]/60">
              <button
                type="button"
                disabled={isDeletingWithSafeguard}
                onClick={() => setDeleteTargetStatus(null)}
                className="px-3.5 py-1.5 rounded-lg border border-[#30363d] bg-transparent text-[#c9d1d9] hover:bg-[#21262d] font-medium transition-colors cursor-pointer text-xs disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingWithSafeguard || (deleteStatusJobCount > 0 && !reassignStatus)}
                onClick={handleConfirmDeleteStatus}
                className="px-4 py-1.5 rounded-lg text-white font-medium transition-colors cursor-pointer text-xs bg-[#da3633] hover:bg-[#b62324] disabled:opacity-50"
              >
                {isDeletingWithSafeguard
                  ? "Reassigning & Deleting..."
                  : deleteStatusJobCount > 0
                  ? `Reassign & Delete`
                  : "Delete Status"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Deletion Safeguard Modal for Cycles */}
      {deleteTargetCycle && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-100"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingCycle) {
              setDeleteTargetCycle(null);
            }
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-[#30363d] bg-[#161b22] shadow-2xl p-5 flex flex-col gap-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  deleteCycleJobCount > 0
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}
              >
                {deleteCycleJobCount > 0 ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[#f0f6fc] leading-snug">
                  Delete &ldquo;{deleteTargetCycle}&rdquo; cycle?
                </h3>
                {deleteCycleJobCount > 0 ? (
                  <p className="mt-1 text-xs text-[#8b949e] leading-relaxed">
                    You have{" "}
                    <span className="font-semibold text-amber-300 font-mono">
                      {deleteCycleJobCount} {deleteCycleJobCount === 1 ? "application" : "applications"}
                    </span>{" "}
                    tagged with this cycle. You can reassign them to another cycle or leave them untagged.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-[#8b949e] leading-relaxed">
                    No applications are currently tagged with this cycle. Are you sure you want to remove it?
                  </p>
                )}
              </div>
            </div>

            {deleteCycleJobCount > 0 && (
              <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-2">
                <label className="block text-[11px] font-medium text-[#c9d1d9]">
                  Reassign existing applications to:
                </label>
                <select
                  value={reassignCycle}
                  onChange={(e) => setReassignCycle(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] text-xs text-[#f0f6fc] rounded-md px-3 py-2 outline-none focus:border-[#58a6ff] cursor-pointer"
                >
                  <option value="">(Leave untagged)</option>
                  {cycles
                    .filter((c) => c !== deleteTargetCycle)
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#30363d]/60">
              <button
                type="button"
                disabled={isDeletingCycle}
                onClick={() => setDeleteTargetCycle(null)}
                className="px-3.5 py-1.5 rounded-lg border border-[#30363d] bg-transparent text-[#c9d1d9] hover:bg-[#21262d] font-medium transition-colors cursor-pointer text-xs disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingCycle}
                onClick={handleConfirmDeleteCycle}
                className="px-4 py-1.5 rounded-lg text-white font-medium transition-colors cursor-pointer text-xs bg-[#da3633] hover:bg-[#b62324] disabled:opacity-50"
              >
                {isDeletingCycle
                  ? "Deleting..."
                  : deleteCycleJobCount > 0
                  ? (reassignCycle ? "Reassign & Delete" : "Untag & Delete")
                  : "Delete Cycle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
