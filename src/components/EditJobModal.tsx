"use client";

import { useEffect, useState, FormEvent, KeyboardEvent } from "react";
import type { ApplicationStatus, JobApplication } from "@/types/job";
import { useSettings } from "@/context/SettingsContext";
import DatePicker from "@/components/DatePicker";
import ConfirmModal from "@/components/ConfirmModal";
import { getEffectiveJobId, formatDateDisplay, findDuplicateJob, formatDuplicateMessage } from "@/lib/jobId";

interface EditJobModalProps {
  job: JobApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updated: Partial<JobApplication>) => void;
  onDelete: (id: string) => void;
  existingJobs?: JobApplication[];
}

export default function EditJobModal({
  job,
  isOpen,
  onClose,
  onSave,
  onDelete,
  existingJobs,
}: EditJobModalProps) {
  const { customFields, statuses } = useSettings();
  const activeCustomFields = customFields.filter((f) => f.enabled && f.id !== "notes");

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("Applied");
  const [appliedDate, setAppliedDate] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!job || !isOpen) return;

    setCompany(job.company || "");
    setRole(job.role || "");
    setStatus(job.status || "Applied");
    setAppliedDate(job.appliedDate || "");
    setUrl(job.url === "#" ? "" : job.url || "");
    setNotes(job.notes || "");

    const custom: Record<string, string> = { ...(job.customFields || {}) };
    if (job.salary && !custom.salary) custom.salary = job.salary;
    if (job.location && !custom.location) custom.location = job.location;
    if (job.deadlineDate && !custom.deadlineDate) custom.deadlineDate = job.deadlineDate;
    if (job.jobId && !custom.jobId) custom.jobId = job.jobId;
    else if (!custom.jobId) {
      const extracted = getEffectiveJobId(job);
      if (extracted) custom.jobId = extracted;
    }
    setCustomValues(custom);
  }, [job, isOpen]);

  const effectiveJobId = job ? getEffectiveJobId(job) : null;
  const duplicateJob = job && existingJobs ? findDuplicateJob(job, existingJobs, job.id) : null;

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !job) return null;

  function handleSubmit(e?: FormEvent) {
    if (e) e.preventDefault();
    if (!company.trim() || !role.trim() || !job) return;

    onSave(job.id, {
      company: company.trim(),
      role: role.trim(),
      status,
      appliedDate,
      url: url.trim() || "#",
      notes: notes.trim(),
      jobId: customValues["jobId"]?.trim() || effectiveJobId || undefined,
      salary: customValues["salary"]?.trim() || undefined,
      location: customValues["location"]?.trim() || undefined,
      deadlineDate: customValues["deadlineDate"]?.trim() || undefined,
      customFields: Object.keys(customValues).length > 0 ? customValues : undefined,
    });

    onClose();
  }

  function handleCustomChange(fieldId: string, val: string) {
    setCustomValues((prev) => ({ ...prev, [fieldId]: val }));
  }

  function handleFormKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleSubmit();
    }
  }

  function handleDelete() {
    if (!job) return;
    setIsDeleteConfirmOpen(true);
  }

  function executeDelete() {
    if (!job) return;
    onDelete(job.id);
    setIsDeleteConfirmOpen(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-xl border border-[#30363d] bg-[#161b22] shadow-2xl flex flex-col overflow-hidden max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[#30363d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#58a6ff]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#f0f6fc]">
                Edit Application
              </h2>
              <p className="text-xs text-[#8b949e]">
                {job.company} · {job.role}
              </p>
            </div>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {duplicateJob && (
            <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-200 text-xs flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <span className="font-semibold block text-amber-300">Duplicate Application Found</span>
                <span>You also applied to this job on [{formatDateDisplay(duplicateJob.appliedDate)}]</span>
              </div>
            </div>
          )}

          {/* Company & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8b949e] text-[11px] font-medium mb-1.5">
                Company Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company (e.g. Amazon)"
                className="w-full bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] text-xs rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-[#8b949e] text-[11px] font-medium mb-1.5">
                Role / Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Role (e.g. Software Engineer)"
                className="w-full bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] text-xs rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] transition-colors"
                required
              />
            </div>
          </div>

          {/* Status & Date Applied */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8b949e] text-[11px] font-medium mb-1.5">
                Application Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                className="w-full bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] text-xs rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] transition-colors cursor-pointer"
              >
                {Array.from(new Set([...statuses, ...(job?.status ? [job.status] : [])])).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#8b949e] text-[11px] font-medium mb-1.5">
                Date Applied
              </label>
              <DatePicker
                value={appliedDate}
                onChange={setAppliedDate}
                title="Date Applied"
                className="w-full bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] text-xs rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] transition-colors font-mono h-[34px]"
              />
            </div>
          </div>

          {/* Active Custom Fields (if any) */}
          {activeCustomFields.length > 0 && (
            <div className="pt-2 border-t border-[#30363d]/60 space-y-3">
              <span className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider block">
                Custom Fields
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeCustomFields.map((field) => {
                  const isDate = field.type === "date";
                  return (
                    <div key={field.id}>
                      <label className="block text-[#8b949e] text-[11px] font-medium mb-1.5">
                        {field.name}
                      </label>
                      {isDate ? (
                        <DatePicker
                          value={customValues[field.id] || ""}
                          onChange={(val) => handleCustomChange(field.id, val)}
                          title={field.name}
                          placeholder={field.name}
                          className="w-full bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] text-xs rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] transition-colors font-mono h-[34px]"
                        />
                      ) : (
                        <input
                          type={field.type === "number" ? "number" : "text"}
                          value={customValues[field.id] || ""}
                          onChange={(e) => handleCustomChange(field.id, e.target.value)}
                          placeholder={field.name}
                          className="w-full bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] text-xs rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] transition-colors"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Posting URL */}
          <div className="pt-2 border-t border-[#30363d]/60">
            <label className="block text-[#8b949e] text-[11px] font-medium mb-1.5">
              Job Posting URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] text-xs rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] transition-colors font-mono"
              />
              {url.trim() && (
                <a
                  href={url.startsWith("http") ? url : `https://${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#58a6ff] text-xs rounded-lg transition-colors flex items-center gap-1 shrink-0"
                >
                  Visit ↗
                </a>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[#8b949e] text-[11px] font-medium mb-1.5">
              Notes & Next Steps
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add key notes, recruiter contact, interview questions..."
              className="w-full bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] text-xs rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] transition-colors resize-y leading-relaxed"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-6 py-3 border-t border-[#30363d] bg-[#161b22] gap-2.5 sm:gap-0 shrink-0">
          <button
            type="button"
            onClick={handleDelete}
            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 px-3 py-1.5 rounded-md transition-colors cursor-pointer text-center"
          >
            Delete Application
          </button>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-[#8b949e] hover:text-[#c9d1d9] px-3 py-1.5 rounded-md hover:bg-[#21262d] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="text-xs font-medium text-white bg-[#238636] hover:bg-[#2ea043] px-4 py-1.5 rounded-md transition-colors cursor-pointer shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={executeDelete}
        title="Delete Application"
        message={job ? `Are you sure you want to permanently delete the application for ${job.company} (${job.role})? This cannot be undone.` : ""}
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
}
