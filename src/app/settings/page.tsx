"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
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
    removeCustomField,
    toggleCustomField,
    statuses,
    addStatus,
    removeStatus,
    reorderStatuses,
    shortcuts,
    updateShortcut,
    resetShortcuts,
    extensionSettings,
    updateExtensionSettings,
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
                    <input
                      type="text"
                      placeholder="Field name (e.g. Recruiter Contact)"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      className="flex-1 bg-[#0d1117] border border-[#30363d] text-xs text-[#f0f6fc] placeholder-[#8b949e] rounded-md px-3 py-2 outline-none focus:border-[#58a6ff]"
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
                    {customFields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-2.5 rounded-md border border-[#30363d] bg-[#0d1117]"
                      >
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

                        <button
                          type="button"
                          onClick={() => removeCustomField(field.id)}
                          className="text-xs text-[#8b949e] hover:text-[#f85149] px-2 py-1 rounded transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
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
                    <input
                      type="text"
                      placeholder="Status name (e.g. Assessment, Phone Screen)..."
                      value={newStatusName}
                      onChange={(e) => {
                        setNewStatusName(e.target.value);
                        if (statusError) setStatusError("");
                      }}
                      className="flex-1 bg-[#0d1117] border border-[#30363d] text-xs text-[#f0f6fc] placeholder-[#8b949e] rounded-md px-3 py-2 outline-none focus:border-[#58a6ff]"
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
                      const isDragged = draggedStatus === statusName;
                      const isOver = dragOverStatus === statusName && !isDragged;

                      return (
                        <div
                          key={statusName}
                          draggable={true}
                          onDragStart={(e) => {
                            setDraggedStatus(statusName);
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", statusName);
                          }}
                          onDragOver={(e) => {
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
                          className={`flex items-center justify-between p-2.5 rounded-md border bg-[#0d1117] transition-all duration-150 relative ${
                            isDragged
                              ? "opacity-30 border-dashed border-[#58a6ff]"
                              : isOver && dragOverSide === "above"
                              ? "border-[#30363d] border-t-2 border-t-[#58a6ff]"
                              : isOver && dragOverSide === "below"
                              ? "border-[#30363d] border-b-2 border-b-[#58a6ff]"
                              : "border-[#30363d]"
                          }`}
                        >
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

                          <button
                            type="button"
                            onClick={() => removeStatus(statusName)}
                            className="text-xs text-[#8b949e] hover:text-[#f85149] px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 6. SHORTCUTS SECTION */}
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
    </div>
  );
}
