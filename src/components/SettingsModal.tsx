"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  useSettings,
  SUGGESTED_FIELDS,
  SUGGESTED_STATUSES,
  STANDARD_COLUMN_NAMES,
  SHORTCUT_LABELS,
  type StandardColumnsSettings,
  type ShortcutSettings,
} from "@/context/SettingsContext";
import type { CustomFieldType } from "@/types/job";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = "general" | "statuses" | "columns" | "shortcuts";

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    theme,
    setTheme,
    standardColumns,
    toggleStandardColumn,
    showRowNumbers,
    toggleShowRowNumbers,
    customFields,
    addCustomField,
    removeCustomField,
    toggleCustomField,
    statuses,
    addStatus,
    removeStatus,
    reorderStatuses,
    resetStatuses,
    shortcuts,
    updateShortcut,
    resetShortcuts,
  } = useSettings();

  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>("text");
  const [newStatusName, setNewStatusName] = useState("");
  const [recordingShortcut, setRecordingShortcut] = useState<keyof ShortcutSettings | null>(null);

  // Drag and drop state for statuses (6-dot grip handle)
  const [draggedStatus, setDraggedStatus] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [dragOverSide, setDragOverSide] = useState<"above" | "below">("above");

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleCreateField(e: FormEvent) {
    e.preventDefault();
    if (!newFieldName.trim()) return;
    addCustomField(newFieldName.trim(), newFieldType);
    setNewFieldName("");
    setNewFieldType("text");
  }

  function handleAddStatus(e: FormEvent) {
    e.preventDefault();
    if (!newStatusName.trim()) return;
    addStatus(newStatusName.trim());
    setNewStatusName("");
  }

  const standardColumnKeys: (keyof StandardColumnsSettings)[] = [
    "company",
    "role",
    "status",
    "appliedDate",
    "url",
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-xl border border-[#30363d] bg-[#161b22] shadow-2xl flex flex-col overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#30363d]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#58a6ff]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-[#f0f6fc]">
              Settings
            </h2>
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

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-[#30363d] bg-[#0d1117] gap-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === "general"
                ? "border-[#58a6ff] text-[#f0f6fc]"
                : "border-transparent text-[#8b949e] hover:text-[#c9d1d9]"
            }`}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("statuses")}
            className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === "statuses"
                ? "border-[#58a6ff] text-[#f0f6fc]"
                : "border-transparent text-[#8b949e] hover:text-[#c9d1d9]"
            }`}
          >
            <span>Statuses</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#21262d] text-[#8b949e]">
              {statuses.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("columns")}
            className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === "columns"
                ? "border-[#58a6ff] text-[#f0f6fc]"
                : "border-transparent text-[#8b949e] hover:text-[#c9d1d9]"
            }`}
          >
            <span>Columns</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#21262d] text-[#8b949e]">
              {customFields.filter((f) => f.enabled).length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("shortcuts")}
            className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === "shortcuts"
                ? "border-[#58a6ff] text-[#f0f6fc]"
                : "border-transparent text-[#8b949e] hover:text-[#c9d1d9]"
            }`}
          >
            Shortcuts
          </button>
        </div>

        {/* Modal Body (Tab Panels) */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* TAB 1: GENERAL */}
          {activeTab === "general" && (
            <div className="space-y-6">
              {/* Appearance */}
              <div>
                <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider block mb-2.5">
                  Appearance Theme
                </span>
                <div className="theme-slider-track relative flex items-center bg-[#0d1117] p-1 rounded-full border border-[#30363d] w-24 h-8 shadow-inner">
                  <div
                    className={`theme-slider-thumb absolute top-1 bottom-1 left-1 w-[40px] rounded-full bg-white/15 backdrop-blur-md border border-white/20 shadow-sm transition-transform duration-200 ease-out ${
                      theme === "light" ? "translate-x-[46px]" : "translate-x-0"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    title="Dark mode"
                    aria-label="Dark mode"
                    className={`relative z-10 w-1/2 h-full flex items-center justify-center transition-colors cursor-pointer ${
                      theme === "dark" ? "text-amber-300" : "text-[#8b949e] hover:text-[#c9d1d9]"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    title="Light mode"
                    aria-label="Light mode"
                    className={`relative z-10 w-1/2 h-full flex items-center justify-center transition-colors cursor-pointer ${
                      theme === "light" ? "text-amber-500" : "text-[#8b949e] hover:text-[#c9d1d9]"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="border-t border-[#30363d]/60" />

              {/* Table Preferences (Row Numbers) */}
              <div>
                <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider block mb-2.5">
                  Table Preferences
                </span>
                <div className="flex items-center justify-between p-3 rounded-lg border border-[#30363d] bg-[#0d1117]">
                  <div>
                    <span className="font-medium text-[#f0f6fc] block">
                      Show Row Numbers (#)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleShowRowNumbers}
                    role="switch"
                    aria-checked={showRowNumbers}
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      showRowNumbers ? "bg-[#238636]" : "bg-[#30363d]"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        showRowNumbers ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STATUSES (6-DOT DRAG & DROP REORDERING) */}
          {activeTab === "statuses" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider block">
                  Pipeline Statuses
                </span>
                <button
                  type="button"
                  onClick={resetStatuses}
                  className="text-[11px] text-[#8b949e] hover:text-[#58a6ff] transition-colors cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>

              {/* Quick-Add Suggestions */}
              <div>
                <span className="text-[11px] font-medium text-[#8b949e] block mb-1.5">
                  Quick-Add Suggestions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_STATUSES.map((s) => {
                    const alreadyExists = statuses.some(
                      (status) => status.toLowerCase() === s.toLowerCase()
                    );
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={alreadyExists}
                        onClick={() => addStatus(s)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                          alreadyExists
                            ? "border-[#30363d] bg-[#21262d]/40 text-[#8b949e] opacity-60 cursor-default"
                            : "border-[#30363d] bg-[#21262d] text-[#c9d1d9] hover:text-white hover:border-[#58a6ff] hover:bg-[#161b22] cursor-pointer"
                        }`}
                      >
                        {alreadyExists ? `✓ ${s}` : `+ ${s}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add Custom Status Form */}
              <form
                onSubmit={handleAddStatus}
                className="flex gap-2 items-center bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d]"
              >
                <input
                  type="text"
                  placeholder="New status name (e.g. OA, Phone Screen, Other)"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  className="flex-1 bg-[#161b22] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] text-xs rounded px-2.5 py-1.5 outline-none focus:border-[#58a6ff]"
                />
                <button
                  type="submit"
                  disabled={!newStatusName.trim()}
                  className={`text-xs font-medium px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                    !newStatusName.trim()
                      ? "bg-[#21262d] text-[#8b949e] cursor-not-allowed border border-[#30363d]"
                      : "bg-[#238636] hover:bg-[#2ea043] text-white cursor-pointer"
                  }`}
                >
                  + Add Status
                </button>
              </form>

              {/* Status List with 6-dot Drag Handle */}
              <div className="space-y-1.5">
                {statuses.map((status, index) => {
                  const isTopFour = index < 4;
                  const isDragged = draggedStatus === status;
                  const isDragOver = dragOverStatus === status && !isDragged;

                  return (
                    <div
                      key={status}
                      draggable={true}
                      onDragStart={(e) => {
                        setDraggedStatus(status);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", status);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (draggedStatus && draggedStatus !== status) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const midpoint = rect.top + rect.height / 2;
                          const side = e.clientY < midpoint ? "above" : "below";
                          setDragOverStatus((prev) => (prev !== status ? status : prev));
                          setDragOverSide((prev) => (prev !== side ? side : prev));
                        }
                      }}
                      onDragLeave={(e) => {
                        if (e.currentTarget === e.target) {
                          setDragOverStatus((prev) => (prev === status ? null : prev));
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const source = draggedStatus || e.dataTransfer.getData("text/plain");
                        if (source && source !== status) {
                          reorderStatuses(source, status, dragOverSide);
                        }
                        setDraggedStatus(null);
                        setDragOverStatus(null);
                      }}
                      onDragEnd={() => {
                        setDraggedStatus(null);
                        setDragOverStatus(null);
                      }}
                      className={`flex items-center justify-between p-2 rounded-lg border bg-[#0d1117] transition-all group ${
                        isDragged ? "opacity-30 bg-[#21262d]" : "hover:border-[#58a6ff]/40"
                      } ${
                        isDragOver
                          ? dragOverSide === "above"
                            ? "border-t-2 border-t-[#58a6ff] bg-[#58a6ff]/10"
                            : "border-b-2 border-b-[#58a6ff] bg-[#58a6ff]/10"
                          : "border-[#30363d]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {/* 6-dot grip handle icon */}
                        <div
                          className="cursor-grab active:cursor-grabbing text-[#8b949e] hover:text-[#f0f6fc] p-0.5 rounded transition-colors"
                          title="Drag grip handle to reorder"
                        >
                          <svg className="w-3.5 h-3.5 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="9" cy="5" r="1.5" />
                            <circle cx="15" cy="5" r="1.5" />
                            <circle cx="9" cy="12" r="1.5" />
                            <circle cx="15" cy="12" r="1.5" />
                            <circle cx="9" cy="19" r="1.5" />
                            <circle cx="15" cy="19" r="1.5" />
                          </svg>
                        </div>

                        <span className="font-mono text-[10px] text-[#8b949e] w-4 text-center">
                          {index + 1}
                        </span>
                        <span className="font-medium text-xs text-[#f0f6fc]">
                          {status}
                        </span>
                        {isTopFour ? (
                          <span className="text-[10px] text-[#58a6ff] px-1.5 py-0.2 rounded bg-[#58a6ff]/10 border border-[#58a6ff]/20">
                            Pill
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#8b949e] px-1.5 py-0.2 rounded bg-[#21262d]">
                            In More ▾
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={statuses.length <= 1}
                        onClick={() => removeStatus(status)}
                        className="p-1 text-[#8b949e] hover:text-[#f85149] disabled:opacity-20 disabled:hover:text-[#8b949e] rounded hover:bg-[#21262d] cursor-pointer disabled:cursor-default transition-colors text-xs"
                        title={`Delete status "${status}"`}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: COLUMNS & CUSTOM FIELDS */}
          {activeTab === "columns" && (
            <div className="space-y-6">
              {/* Standard Columns Visibility */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider block">
                  Standard Columns
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {standardColumnKeys.map((colKey) => {
                    const isEnabled = standardColumns[colKey];
                    return (
                      <button
                        key={colKey}
                        type="button"
                        onClick={() => toggleStandardColumn(colKey)}
                        className={`p-2.5 rounded-lg border text-left transition-colors flex items-center justify-between cursor-pointer ${
                          isEnabled
                            ? "border-[#58a6ff]/60 bg-[#58a6ff]/10 text-[#f0f6fc]"
                            : "border-[#30363d] bg-[#0d1117] text-[#8b949e] hover:border-[#8b949e]"
                        }`}
                      >
                        <span className="font-medium text-xs">
                          {STANDARD_COLUMN_NAMES[colKey]}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            isEnabled ? "text-[#58a6ff]" : "text-[#8b949e] opacity-40"
                          }`}
                        >
                          {isEnabled ? "✓" : "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-[#30363d]/60" />

              {/* Custom Tracking Fields */}
              <div className="space-y-4">
                <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider block">
                  Custom Tracking Fields
                </span>

                {/* Suggested One-Click Fields */}
                <div>
                  <span className="text-[11px] font-medium text-[#8b949e] block mb-1.5">
                    Quick-Add Suggestions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_FIELDS.map((s) => {
                      const alreadyExists = customFields.some(
                        (f) => f.id === s.id || f.name.toLowerCase() === s.name.toLowerCase()
                      );
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={alreadyExists}
                          onClick={() => addCustomField(s.name, s.type)}
                          className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                            alreadyExists
                              ? "border-[#30363d] bg-[#21262d]/40 text-[#8b949e] opacity-60 cursor-default"
                              : "border-[#30363d] bg-[#21262d] text-[#c9d1d9] hover:text-white hover:border-[#58a6ff] hover:bg-[#161b22] cursor-pointer"
                          }`}
                        >
                          {alreadyExists ? `✓ ${s.name}` : `+ ${s.name}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Field Creator Form */}
                <form
                  onSubmit={handleCreateField}
                  className="flex flex-wrap sm:flex-nowrap gap-2 items-center bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d]"
                >
                  <input
                    type="text"
                    placeholder="Field name (e.g. Recruiter, OA Link)"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="flex-1 bg-[#161b22] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] text-xs rounded px-2.5 py-1.5 outline-none focus:border-[#58a6ff] min-w-[160px]"
                  />
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
                    className="bg-[#161b22] border border-[#30363d] text-[#c9d1d9] text-xs rounded px-2.5 py-1.5 outline-none focus:border-[#58a6ff] cursor-pointer"
                  >
                    <option value="text">Text</option>
                    <option value="date">Date</option>
                    <option value="number">Number</option>
                  </select>
                  <button
                    type="submit"
                    disabled={!newFieldName.trim()}
                    className={`text-xs font-medium px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                      !newFieldName.trim()
                        ? "bg-[#21262d] text-[#8b949e] cursor-not-allowed border border-[#30363d]"
                        : "bg-[#238636] hover:bg-[#2ea043] text-white cursor-pointer"
                    }`}
                  >
                    + Create
                  </button>
                </form>

                {/* Active Custom Fields List */}
                {customFields.length > 0 ? (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-[#8b949e] block">
                      Active Custom Fields ({customFields.length}):
                    </span>
                    <div className="space-y-1.5">
                      {customFields.map((field) => (
                        <div
                          key={field.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-[#30363d] bg-[#0d1117]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#f0f6fc]">
                              {field.name}
                            </span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                              {field.type}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => toggleCustomField(field.id)}
                              role="switch"
                              aria-checked={field.enabled}
                              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                                field.enabled ? "bg-[#238636]" : "bg-[#30363d]"
                              }`}
                            >
                              <span
                                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                                  field.enabled ? "translate-x-4" : "translate-x-0.5"
                                }`}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() => removeCustomField(field.id)}
                              title={`Delete field "${field.name}"`}
                              className="text-[#8b949e] hover:text-[#f85149] p-1 rounded transition-colors cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-center py-2.5 text-xs text-[#8b949e] bg-[#0d1117] rounded-lg border border-[#30363d]/60">
                    No custom fields added yet.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SHORTCUTS */}
          {activeTab === "shortcuts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider block">
                  Keyboard Shortcuts
                </span>
                <button
                  type="button"
                  onClick={resetShortcuts}
                  className="text-[11px] text-[#8b949e] hover:text-[#58a6ff] transition-colors cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>

              <div className="space-y-1.5">
                {(Object.keys(shortcuts) as (keyof ShortcutSettings)[]).map((action) => {
                  const isRecording = recordingShortcut === action;
                  const keyVal = shortcuts[action];
                  const info = SHORTCUT_LABELS[action];

                  return (
                    <div
                      key={action}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-[#30363d] bg-[#0d1117]"
                    >
                      <div>
                        <span className="font-medium text-[#f0f6fc] block">
                          {info?.label || action}
                        </span>
                        <span className="text-[11px] text-[#8b949e]">
                          {info?.desc}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setRecordingShortcut(action)}
                        onKeyDown={(e) => {
                          if (!isRecording) return;
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.key === "Escape") {
                            setRecordingShortcut(null);
                            return;
                          }
                          const pressed = e.key.length === 1 ? e.key.toLowerCase() : e.key;
                          updateShortcut(action, pressed);
                          setRecordingShortcut(null);
                        }}
                        className={`min-w-[42px] px-2.5 py-1 text-center font-mono text-xs rounded border transition-all cursor-pointer ${
                          isRecording
                            ? "border-[#58a6ff] bg-[#58a6ff]/20 text-[#58a6ff] animate-pulse ring-2 ring-[#58a6ff]/30"
                            : "border-[#30363d] bg-[#21262d] text-[#c9d1d9] hover:border-[#8b949e] hover:bg-[#30363d]"
                        }`}
                      >
                        {isRecording ? "Press key..." : keyVal?.toUpperCase() || "—"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-[#30363d] bg-[#161b22]">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-white bg-[#238636] hover:bg-[#2ea043] px-4 py-2 rounded-md transition-colors cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
