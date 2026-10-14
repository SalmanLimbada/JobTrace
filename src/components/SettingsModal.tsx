"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  useSettings,
  SUGGESTED_FIELDS,
  type AppTheme,
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
    customFields,
    addCustomField,
    removeCustomField,
    toggleCustomField,
  } = useSettings();

  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>("text");

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-xl border border-[#30363d] bg-[#161b22] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
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
                Customize your appearance and custom tracking columns
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#f0f6fc] p-1.5 rounded-md text-xs transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Appearance Section */}
          <div>
            <h3 className="text-xs font-semibold text-[#f0f6fc] uppercase tracking-wider mb-2.5">
              Appearance
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                  theme === "dark"
                    ? "border-[#58a6ff] bg-[#58a6ff]/10 ring-1 ring-[#58a6ff]"
                    : "border-[#30363d] bg-[#0d1117] hover:border-[#8b949e] hover:bg-[#21262d]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🌙</span>
                  <div>
                    <span className="font-semibold text-[#f0f6fc] text-xs block">
                      Dark Mode
                    </span>
                    <span className="text-[11px] text-[#8b949e]">
                      Developer slate & midnight contrast
                    </span>
                  </div>
                </div>
                {theme === "dark" && (
                  <span className="text-xs text-[#58a6ff] font-bold">✓</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                  theme === "light"
                    ? "border-[#0969da] bg-[#0969da]/10 ring-1 ring-[#0969da]"
                    : "border-[#30363d] bg-[#0d1117] hover:border-[#8b949e] hover:bg-[#21262d]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">☀️</span>
                  <div>
                    <span className="font-semibold text-[#f0f6fc] text-xs block">
                      Light Mode
                    </span>
                    <span className="text-[11px] text-[#8b949e]">
                      Clean high-contrast daylight
                    </span>
                  </div>
                </div>
                {theme === "light" && (
                  <span className="text-xs text-[#0969da] font-bold">✓</span>
                )}
              </button>
            </div>
          </div>

          <div className="border-t border-[#30363d]/60" />

          {/* Custom Columns & Fields Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-[#f0f6fc] uppercase tracking-wider mb-1">
                Custom Tracking Fields
              </h3>
              <p className="text-[#8b949e] text-[11px]">
                Create your own fields (e.g. Recruiter, Tech Stack) or enable suggestions below.
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

            {/* User Custom Field Creator */}
            <form
              onSubmit={handleCreateField}
              className="flex flex-wrap sm:flex-nowrap gap-2 items-center bg-[#0d1117] p-2.5 rounded-lg border border-[#30363d]"
            >
              <input
                type="text"
                placeholder="New field name (e.g. Recruiter, Priority, OA Link)"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                className="flex-1 bg-[#161b22] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] text-xs rounded px-2.5 py-1.5 outline-none focus:border-[#58a6ff] min-w-[180px]"
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
                + Create Field
              </button>
            </form>

            {/* List of Active Custom Fields */}
            {customFields.length > 0 ? (
              <div className="space-y-2">
                <span className="text-[11px] font-medium text-[#8b949e] block">
                  Your Active Fields ({customFields.length}):
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
                        {/* Toggle */}
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

                        {/* Delete Field */}
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
              <p className="text-center py-3 text-xs text-[#8b949e] bg-[#0d1117] rounded-lg border border-[#30363d]/60">
                No custom fields added yet. Use the suggestions above or type your own!
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-[#30363d] bg-[#161b22]">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-white bg-[#238636] hover:bg-[#2ea043] px-4 py-2 rounded-md transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
