"use client";

import { useEffect, useState, FormEvent, useMemo } from "react";
import {
  useSettings,
  SUGGESTED_FIELDS,
  SUGGESTED_STATUSES,
  STANDARD_COLUMN_NAMES,
  SHORTCUT_LABELS,
  DEFAULT_STATUSES,
  DEFAULT_SHORTCUTS,
  type StandardColumnsSettings,
  type ShortcutSettings,
} from "@/context/SettingsContext";
import type { CustomFieldDefinition, CustomFieldType } from "@/types/job";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = "general" | "statuses" | "columns" | "shortcuts";

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    standardColumns,
    showRowNumbers,
    customFields,
    statuses,
    shortcuts,
    applySettings,
  } = useSettings();

  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  // Local draft states (staged until Save & Apply Changes is clicked)
  const [draftShowRowNumbers, setDraftShowRowNumbers] = useState(showRowNumbers);
  const [draftStandardColumns, setDraftStandardColumns] = useState<StandardColumnsSettings>(standardColumns);
  const [draftStatuses, setDraftStatuses] = useState<string[]>(statuses);
  const [draftCustomFields, setDraftCustomFields] = useState<CustomFieldDefinition[]>(customFields);
  const [draftShortcuts, setDraftShortcuts] = useState<ShortcutSettings>(shortcuts);

  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>("text");
  const [newStatusName, setNewStatusName] = useState("");
  const [recordingShortcut, setRecordingShortcut] = useState<keyof ShortcutSettings | null>(null);

  // Drag and drop state for statuses (6-dot grip handle)
  const [draggedStatus, setDraggedStatus] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [dragOverSide, setDragOverSide] = useState<"above" | "below">("above");

  // Re-sync draft state from context when modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftShowRowNumbers(showRowNumbers);
      setDraftStandardColumns(standardColumns);
      setDraftStatuses(statuses);
      setDraftCustomFields(customFields);
      setDraftShortcuts(shortcuts);
      setNewFieldName("");
      setNewStatusName("");
      setRecordingShortcut(null);
    }
  }, [isOpen, showRowNumbers, standardColumns, statuses, customFields, shortcuts]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Dirty state calculation
  const isDirty = useMemo(() => {
    return (
      draftShowRowNumbers !== showRowNumbers ||
      JSON.stringify(draftStandardColumns) !== JSON.stringify(standardColumns) ||
      JSON.stringify(draftStatuses) !== JSON.stringify(statuses) ||
      JSON.stringify(draftCustomFields) !== JSON.stringify(customFields) ||
      JSON.stringify(draftShortcuts) !== JSON.stringify(shortcuts)
    );
  }, [
    draftShowRowNumbers,
    showRowNumbers,
    draftStandardColumns,
    standardColumns,
    draftStatuses,
    statuses,
    draftCustomFields,
    customFields,
    draftShortcuts,
    shortcuts,
  ]);

  if (!isOpen) return null;

  function handleSave() {
    applySettings({
      showRowNumbers: draftShowRowNumbers,
      standardColumns: draftStandardColumns,
      statuses: draftStatuses,
      customFields: draftCustomFields,
      shortcuts: draftShortcuts,
    });
    onClose();
  }

  // --- Draft Column Handlers ---
  function handleToggleStandardColumn(colKey: keyof StandardColumnsSettings) {
    setDraftStandardColumns((prev) => ({
      ...prev,
      [colKey]: !prev[colKey],
    }));
  }

  function handleAddCustomField(name: string, type: CustomFieldType = "text") {
    const trimmed = name.trim();
    if (!trimmed) return;
    const cleanId = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "_") || `field_${Date.now()}`;
    const exists = draftCustomFields.some(
      (f) => f.id === cleanId || f.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setDraftCustomFields((prev) =>
        prev.map((f) =>
          f.id === cleanId || f.name.toLowerCase() === trimmed.toLowerCase()
            ? { ...f, enabled: true }
            : f
        )
      );
    } else {
      setDraftCustomFields((prev) => [
        ...prev,
        { id: cleanId, name: trimmed, type, enabled: true },
      ]);
    }
  }

  function handleCreateField(e: FormEvent) {
    e.preventDefault();
    if (!newFieldName.trim()) return;
    handleAddCustomField(newFieldName.trim(), newFieldType);
    setNewFieldName("");
    setNewFieldType("text");
  }

  function handleToggleCustomField(id: string) {
    setDraftCustomFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  }

  function handleRemoveCustomField(id: string) {
    setDraftCustomFields((prev) => prev.filter((f) => f.id !== id));
  }

  // --- Draft Status Handlers ---
  function handleAddStatus(e: FormEvent) {
    e.preventDefault();
    const trimmed = newStatusName.trim();
    if (!trimmed) return;
    if (!draftStatuses.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setDraftStatuses((prev) => [...prev, trimmed]);
    }
    setNewStatusName("");
  }

  function handleRemoveStatus(name: string) {
    if (draftStatuses.length <= 1) return;
    setDraftStatuses((prev) => prev.filter((s) => s !== name));
  }

  function handleResetStatuses() {
    setDraftStatuses(DEFAULT_STATUSES);
  }

  function handleReorderStatuses(sourceName: string, targetName: string, side: "above" | "below" = "above") {
    if (sourceName === targetName) return;
    const sourceIdx = draftStatuses.indexOf(sourceName);
    if (sourceIdx === -1) return;
    const next = [...draftStatuses];
    const [moved] = next.splice(sourceIdx, 1);
    const targetIdx = next.indexOf(targetName);
    if (targetIdx === -1) return;
    const insertIdx = side === "above" ? targetIdx : targetIdx + 1;
    next.splice(insertIdx, 0, moved);
    setDraftStatuses(next);
  }

  // --- Draft Shortcut Handlers ---
  function handleUpdateShortcut(action: keyof ShortcutSettings, key: string) {
    setDraftShortcuts((prev) => ({ ...prev, [action]: key.toLowerCase() }));
  }

  function handleResetShortcuts() {
    setDraftShortcuts(DEFAULT_SHORTCUTS);
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
              {draftStatuses.length}
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
              {draftCustomFields.filter((f) => f.enabled).length}
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
                    onClick={() => setDraftShowRowNumbers((prev) => !prev)}
                    role="switch"
                    aria-checked={draftShowRowNumbers}
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      draftShowRowNumbers ? "bg-[#238636]" : "bg-[#30363d]"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        draftShowRowNumbers ? "translate-x-4" : "translate-x-0.5"
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
                  onClick={handleResetStatuses}
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
                    const alreadyExists = draftStatuses.some(
                      (status) => status.toLowerCase() === s.toLowerCase()
                    );
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={alreadyExists}
                        onClick={() => {
                          if (!alreadyExists) {
                            setDraftStatuses((prev) => [...prev, s]);
                          }
                        }}
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
                {draftStatuses.map((status, index) => {
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
                          handleReorderStatuses(source, status, dragOverSide);
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
                        disabled={draftStatuses.length <= 1}
                        onClick={() => handleRemoveStatus(status)}
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
                    const isEnabled = draftStandardColumns[colKey];
                    return (
                      <button
                        key={colKey}
                        type="button"
                        onClick={() => handleToggleStandardColumn(colKey)}
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
                      const alreadyExists = draftCustomFields.some(
                        (f) => f.id === s.id || f.name.toLowerCase() === s.name.toLowerCase()
                      );
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={alreadyExists}
                          onClick={() => handleAddCustomField(s.name, s.type)}
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
                {draftCustomFields.length > 0 ? (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-[#8b949e] block">
                      Active Custom Fields ({draftCustomFields.length}):
                    </span>
                    <div className="space-y-1.5">
                      {draftCustomFields.map((field) => (
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
                              onClick={() => handleToggleCustomField(field.id)}
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
                              onClick={() => handleRemoveCustomField(field.id)}
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
                  onClick={handleResetShortcuts}
                  className="text-[11px] text-[#8b949e] hover:text-[#58a6ff] transition-colors cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>

              <div className="space-y-1.5">
                {(Object.keys(draftShortcuts) as (keyof ShortcutSettings)[]).map((action) => {
                  const isRecording = recordingShortcut === action;
                  const keyVal = draftShortcuts[action];
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
                          handleUpdateShortcut(action, pressed);
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
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#30363d] bg-[#161b22]">
          <div>
            {isDirty ? (
              <span className="text-xs text-amber-400 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Unsaved changes
              </span>
            ) : (
              <span className="text-xs text-[#8b949e]">
                All settings up to date
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] px-3.5 py-2 rounded-md transition-colors cursor-pointer font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty}
              className={`text-xs font-semibold px-4 py-2 rounded-md transition-all shadow-xs flex items-center gap-1.5 ${
                isDirty
                  ? "bg-[#238636] hover:bg-[#2ea043] text-white cursor-pointer"
                  : "bg-[#21262d] text-[#8b949e] opacity-60 cursor-not-allowed"
              }`}
            >
              Save & Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
