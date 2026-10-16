"use client";
import { useEffect, useState, useMemo } from "react";
import type { ApplicationStatus, JobApplication } from "@/types/job";
import { useSettings } from "@/context/SettingsContext";
import DatePicker from "@/components/DatePicker";
import { extractJobIdFromUrl, findDuplicateJob, formatDuplicateMessage } from "@/lib/jobId";

export interface NewJobPayload {
  company: string;
  role: string;
  status: ApplicationStatus;
  appliedDate?: string;
  url: string;
  notes: string;
  jobId?: string;
  salary?: string;
  location?: string;
  deadlineDate?: string;
  customFields?: Record<string, string>;
  keyRequirements?: string[];
}

interface JobFormProps {
  onAddJob: (payload: NewJobPayload) => void;
  existingJobs?: JobApplication[];
}

export default function JobForm({ onAddJob, existingJobs }: JobFormProps) {
  const { customFields, statuses, standardColumns, columnOrder } = useSettings();

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>(statuses[0] || "Applied");
  const [appliedDate, setAppliedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (statuses.length > 0 && !statuses.includes(status)) {
      setStatus(statuses[0]);
    }
  }, [statuses, status]);

  function handleFieldValueChange(id: string, val: string) {
    setFieldValues((prev) => ({ ...prev, [id]: val }));
  }

  function handleUrlChange(newUrl: string) {
    setUrl(newUrl);
    if (!fieldValues["jobId"]) {
      const extracted = extractJobIdFromUrl(newUrl);
      if (extracted) {
        setFieldValues((prev) => ({ ...prev, jobId: extracted }));
      }
    }
  }

  const targetJobId = fieldValues["jobId"]?.trim() || extractJobIdFromUrl(url);

  const duplicateJob = useMemo(() => {
    if (!existingJobs || existingJobs.length === 0) return null;
    if (!company.trim() && !role.trim() && !url.trim() && !targetJobId) return null;
    return findDuplicateJob(
      {
        company,
        role,
        url,
        jobId: targetJobId || undefined,
        customFields: fieldValues,
      },
      existingJobs
    );
  }, [company, role, url, targetJobId, fieldValues, existingJobs]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    const today = new Date().toISOString().split("T")[0];

    onAddJob({
      company: company.trim(),
      role: role.trim(),
      status: status || (statuses[0] || "Applied"),
      appliedDate: standardColumns.appliedDate ? (appliedDate || today) : today,
      url: url.trim() || "#",
      notes: notes.trim(),
      jobId: targetJobId || undefined,
      salary: fieldValues["salary"]?.trim() || undefined,
      location: fieldValues["location"]?.trim() || undefined,
      deadlineDate: fieldValues["deadlineDate"]?.trim() || undefined,
      customFields: Object.keys(fieldValues).length > 0 ? fieldValues : undefined,
    });

    setCompany("");
    setRole("");
    setUrl("");
    setStatus(statuses[0] || "Applied");
    setAppliedDate(today);
    setNotes("");
    setFieldValues({});
  }

  // Active custom fields map
  const activeCustomMap = new Map(customFields.filter((f) => f.enabled).map((f) => [f.id, f]));

  // Active fields based on user settings
  const activeStandardSet = new Set(
    Object.entries(standardColumns)
      .filter(([k, v]) => v && k !== "notes")
      .map(([k]) => k)
  );

  // Always require company, role, status in the form
  const allActiveFormColIds = new Set([
    "company",
    "role",
    "status",
    ...Array.from(activeStandardSet),
    ...Array.from(activeCustomMap.keys()),
  ]);

  // Order according to user's columnOrder
  const orderedFormColIds = columnOrder.filter((id) => allActiveFormColIds.has(id));
  allActiveFormColIds.forEach((id) => {
    if (!orderedFormColIds.includes(id)) {
      orderedFormColIds.push(id);
    }
  });

  function renderField(colId: string) {
    switch (colId) {
      case "company":
        return (
          <input
            key="company"
            id="new-job-company-input"
            type="text"
            placeholder="Company *"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500 transition-colors"
            required
          />
        );
      case "role":
        return (
          <input
            key="role"
            type="text"
            placeholder="Role *"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500 transition-colors"
            required
          />
        );
      case "status":
        return (
          <select
            key="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500 transition-colors cursor-pointer"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        );
      case "appliedDate":
        return (
          <div key="appliedDate" className="w-full">
            <DatePicker
              value={appliedDate}
              onChange={setAppliedDate}
              title="Date Applied"
              className="bg-zinc-950 border border-zinc-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-zinc-500 font-mono h-[38px]"
            />
          </div>
        );
      case "url":
        return (
          <input
            key="url"
            type="text"
            placeholder="Posting URL"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500 transition-colors font-mono"
          />
        );
      case "notes":
        if (!activeCustomMap.has("notes")) return null;
        return (
          <input
            key="notes"
            type="text"
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500 transition-colors"
          />
        );
      default: {
        const customField = activeCustomMap.get(colId);
        if (!customField) return null;
        const isDate = customField.type === "date";
        if (isDate) {
          return (
            <div key={colId} className="w-full">
              <DatePicker
                value={fieldValues[colId] || ""}
                onChange={(val) => handleFieldValueChange(colId, val)}
                placeholder={customField.name}
                title={customField.name}
                className="bg-zinc-950 border border-zinc-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-zinc-500 font-mono h-[38px]"
              />
            </div>
          );
        }
        return (
          <input
            key={colId}
            type={customField.type === "number" ? "number" : "text"}
            placeholder={customField.name}
            value={fieldValues[colId] || ""}
            onChange={(e) => handleFieldValueChange(colId, e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500 transition-colors"
          />
        );
      }
    }
  }

  return (
    <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 sm:p-5 mb-6 sm:mb-8 shadow-sm">
      <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5 sm:mb-3">
        Add New Application
      </h2>

      {duplicateJob && (
        <div className="mb-3.5 flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-200 text-xs">
          <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <span className="font-semibold block text-amber-300">
              Already applied to this job!
            </span>
            <span>
              {formatDuplicateMessage(duplicateJob, targetJobId)}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
          {orderedFormColIds.map((colId) => renderField(colId))}
        </div>

        <div className="flex items-center justify-center pt-0.5">
          <button
            type="submit"
            className="w-full sm:w-auto bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-xs px-5 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm hover:shadow h-[38px] flex items-center justify-center gap-1.5 whitespace-nowrap min-w-[120px]"
          >
            <span className="text-sm font-bold leading-none">+</span>
            <span>Add Job</span>
          </button>
        </div>
      </form>
    </section>
  );
}
