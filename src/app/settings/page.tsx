"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
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
  const {
    theme,
    setTheme,
    showRowNumbers,
    setShowRowNumbers,
    standardColumns,
    toggleStandardColumn,
    customFields,
    addCustomField,
    removeCustomField,
    toggleCustomField,
    statuses,
    addStatus,
    removeStatus,
    moveStatus,
    shortcuts,
    updateShortcut,
    resetShortcuts,
    extensionSettings,
    updateExtensionSettings,
  } = useSettings();

  const [activeSection, setActiveSection] = useState<SettingsSection>("extension");

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

  const standardTargetFields = [
    { id: "company", label: "Company" },
    { id: "role", label: "Role Title" },
    { id: "url", label: "Posting URL" },
    { id: "location", label: "Location" },
    { id: "salary", label: "Salary" },
    { id: "notes", label: "Notes" },
    { id: "keyRequirements", label: "Key Requirements" },
  ];

  const seenFieldIds = new Set<string>();
  const availableTargetFields = [
    ...standardTargetFields,
    ...customFields
      .filter((f) => f.enabled)
      .map((f) => ({ id: f.id, label: f.name })),
  ].filter((f) => {
    if (seenFieldIds.has(f.id)) return false;
    seenFieldIds.add(f.id);
    return true;
  });

  const toggleTargetField = (fieldId: string) => {
    const current = extensionSettings.targetFields || DEFAULT_EXTENSION_TARGET_FIELDS;
    const next = current.includes(fieldId)
      ? current.filter((f) => f !== fieldId)
      : [...current, fieldId];
    updateExtensionSettings({ targetFields: next });
  };

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
      label: "Pipeline Statuses",
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

      <main className="p-4 sm:p-8 max-w-5xl mx-auto w-full flex-1">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f0f6fc]">
            Settings
          </h1>
          <p className="text-xs text-[#8b949e] mt-0.5">
            Manage extension scraping, appearance, columns, and preferences
          </p>
        </div>

        {/* Layout: Sidebar + Settings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Navigation Sidebar */}
          <aside className="md:col-span-4 lg:col-span-3 space-y-0.5 border border-[#30363d] bg-[#161b22] p-1.5 rounded-lg">
            {SECTIONS.map((sec) => {
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex flex-col items-start px-3 py-2 rounded-md text-left transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#21262d] text-[#f0f6fc] font-medium"
                      : "text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]/40"
                  }`}
                >
                  <span className="text-xs font-medium">{sec.label}</span>
                  <span className="text-[11px] text-[#8b949e] opacity-80 truncate max-w-full">
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
                    Configure scraping defaults, approval behavior, and target fields.
                  </p>
                </div>

                {/* Auto Approve Toggle */}
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-[#f0f6fc] block">
                      Auto-approve captures
                    </span>
                    <p className="text-xs text-[#8b949e] leading-relaxed">
                      Save scraped jobs directly to the tracker without showing a preview modal.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={extensionSettings.autoApprove}
                    onChange={(e) =>
                      updateExtensionSettings({ autoApprove: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 accent-[#58a6ff] cursor-pointer"
                  />
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

                {/* Target Fields Selection */}
                <div className="p-5 space-y-3">
                  <div>
                    <span className="text-xs font-medium text-[#f0f6fc] block">
                      Fields to Capture
                    </span>
                    <p className="text-xs text-[#8b949e] mt-0.5">
                      Select which fields the extension should detect and extract from the page.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableTargetFields.map((field) => {
                      const isChecked = (
                        extensionSettings.targetFields || DEFAULT_EXTENSION_TARGET_FIELDS
                      ).includes(field.id);
                      return (
                        <label
                          key={field.id}
                          className="flex items-center justify-between p-2.5 rounded-md border border-[#30363d] bg-[#0d1117] hover:border-[#58a6ff]/40 transition-colors cursor-pointer"
                        >
                          <span className="text-xs text-[#f0f6fc] font-medium">
                            {field.label}
                          </span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTargetField(field.id)}
                            className="w-4 h-4 accent-[#58a6ff] cursor-pointer"
                          />
                        </label>
                      );
                    })}
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

            {/* 2. APPEARANCE SECTION */}
            {activeSection === "display" && (
              <div className="border border-[#30363d] bg-[#161b22] rounded-lg overflow-hidden divide-y divide-[#30363d]">
                <div className="px-5 py-4">
                  <h2 className="text-sm font-semibold text-[#f0f6fc]">Appearance</h2>
                  <p className="text-xs text-[#8b949e] mt-0.5">
                    Manage themes and general visual preferences.
                  </p>
                </div>

                <div className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-medium text-[#f0f6fc] block">Interface Theme</span>
                    <span className="text-xs text-[#8b949e]">
                      Switch between dark workspace and high-contrast light mode.
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 p-0.5 bg-[#0d1117] border border-[#30363d] rounded-md">
                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                        theme === "dark"
                          ? "bg-[#21262d] text-[#f0f6fc]"
                          : "text-[#8b949e] hover:text-[#c9d1d9]"
                      }`}
                    >
                      Dark
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                        theme === "light"
                          ? "bg-[#21262d] text-[#f0f6fc]"
                          : "text-[#8b949e] hover:text-[#c9d1d9]"
                      }`}
                    >
                      Light
                    </button>
                  </div>
                </div>

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
                  <h2 className="text-sm font-semibold text-[#f0f6fc]">Pipeline Statuses</h2>
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

                  {/* List of Statuses */}
                  <div className="space-y-1.5 pt-1">
                    {statuses.map((statusName, idx) => (
                      <div
                        key={statusName}
                        className="flex items-center justify-between p-2.5 rounded-md border border-[#30363d] bg-[#0d1117]"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-mono text-[#8b949e] w-4">{idx + 1}</span>
                          <span className="text-xs font-medium text-[#f0f6fc]">{statusName}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveStatus(statusName, "up")}
                            disabled={idx === 0}
                            className="px-2 py-0.5 text-xs text-[#8b949e] hover:text-white disabled:opacity-20 cursor-pointer"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStatus(statusName, "down")}
                            disabled={idx === statuses.length - 1}
                            className="px-2 py-0.5 text-xs text-[#8b949e] hover:text-white disabled:opacity-20 cursor-pointer"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStatus(statusName)}
                            className="text-xs text-[#8b949e] hover:text-[#f85149] px-2 py-0.5 rounded transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
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
