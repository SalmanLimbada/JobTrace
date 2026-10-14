"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  useSettings,
  SUGGESTED_FIELDS,
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
    shortcuts,
    updateShortcut,
    resetShortcuts,
  } = useSettings();

  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>("text");
  const [recordingShortcut, setRecordingShortcut] = useState<keyof ShortcutSettings | null>(null);

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

  const standardColumnKeys: (keyof StandardColumnsSettings)[] = [
    "company",
    "role",
    "status",
    "appliedDate",
    "url",
    "notes",
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-xl border border-[#30363d] bg-[#161b22] shadow-2xl flex flex-col overflow-hidden max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d]">
          <div className="flex items-center gap-2.5">
            <svg
              className="w-5 h-5 text-[#58a6ff]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <div>
              <h2 className="text-sm font-semibold text-[#f0f6fc]">
                Settings & Preferences
              </h2>
              <p className="text-xs text-[#8b949e]">
                Display preferences and tracking columns
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#f0f6fc] p-1.5 rounded-md text-xs transition-colors cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Section 1: iOS-Style Glassy Appearance Switcher */}
          <div>
            <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider block mb-2.5">
              Appearance
            </span>
            <div className="theme-slider-track relative flex items-center bg-[#0d1117] p-1 rounded-full border border-[#30363d] w-24 h-8 shadow-inner">
              {/* Sliding Frosted Glass Thumb */}
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

          {/* Section 2: Table Display Preferences (Row Numbers) */}
          <div>
            <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider block mb-2.5">
              Table Preferences
            </span>
            <div className="flex items-center justify-between p-3 rounded-lg border border-[#30363d] bg-[#0d1117]">
              <div>
                <span className="font-medium text-[#f0f6fc] block">
                  Show Row Numbers (#)
                </span>
                <span className="text-[11px] text-[#8b949e]">
                  Display row index column on the left edge
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

          <div className="border-t border-[#30363d]/60" />

          {/* Section 3: Standard Columns Visibility */}
          <div className="space-y-2.5">
            <div>
              <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider block">
                Standard Columns
              </span>
              <span className="text-[11px] text-[#8b949e]">
                Choose which default columns appear in your tracker table.
              </span>
            </div>

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

          {/* Section 4: Custom Tracking Fields */}
          <div className="space-y-4">
            <div>
              <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider block">
                Custom Tracking Fields
              </span>
              <p className="text-[#8b949e] text-[11px]">
                Create your own fields (e.g. Recruiter, Priority, OA Link) or add suggestions below.
              </p>
            </div>

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

          <div className="border-t border-[#30363d]/60" />

          {/* Section 5: Keyboard Shortcuts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider block">
                  Keyboard Shortcuts
                </span>
                <span className="text-[11px] text-[#8b949e]">
                  Quick navigation and actions (click a key to rebind)
                </span>
              </div>
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
