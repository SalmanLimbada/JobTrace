"use client";
import { useEffect, useState, useMemo } from "react";
import type { ApplicationStatus, JobApplication } from "@/types/job";
import { useSettings } from "@/context/SettingsContext";
import DatePicker from "@/components/DatePicker";
import ClearableInput from "@/components/ClearableInput";
import { extractJobIdFromUrl, findDuplicateJob, formatDuplicateMessage, getLocalDateString } from "@/lib/jobId";
import { getStatusOptionClass } from "@/components/JobTable";

export interface NewJobPayload {
  company: string;
  role: string;
  status: ApplicationStatus;
  appliedDate?: string;
  url: string;
  notes: string;
  cycle?: string;
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
  onOpenJob?: (job: JobApplication) => void;
}

export default function JobForm({ onAddJob, existingJobs, onOpenJob }: JobFormProps) {
  const { customFields, statuses, standardColumns, columnOrder, activeCycle } = useSettings();

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>(statuses[0] || "Applied");
  const [appliedDate, setAppliedDate] = useState(() => getLocalDateString());
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

  // Distinct company and role suggestions for fast typeahead autocomplete
  const existingCompanies = useMemo(() => {
    if (!existingJobs || existingJobs.length === 0) return [];
    const set = new Set<string>();
    for (let i = 0; i < existingJobs.length; i++) {
      const c = existingJobs[i].company?.trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort();
  }, [existingJobs]);

  const existingRoles = useMemo(() => {
    if (!existingJobs || existingJobs.length === 0) return [];
    const set = new Set<string>();
    for (let i = 0; i < existingJobs.length; i++) {
      const r = existingJobs[i].role?.trim();
      if (r) set.add(r);
    }
    return Array.from(set).sort();
  }, [existingJobs]);

  const duplicateJob = useMemo(() => {
    if (!existingJobs || existingJobs.length === 0) return null;
    if (!company.trim() && !role.trim() && !url.trim() && !targetJobId) return null;
    return findDuplicateJob(
      {
        company,
        role,
        url,
        jobId: targetJobId || undefined,
        appliedDate: standardColumns.appliedDate ? appliedDate : getLocalDateString(),
        customFields: fieldValues,
      },
      existingJobs
    );
  }, [company, role, url, targetJobId, appliedDate, standardColumns.appliedDate, fieldValues, existingJobs]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    const today = getLocalDateString();

    onAddJob({
      company: company.trim(),
      role: role.trim(),
      status: status || (statuses[0] || "Applied"),
      appliedDate: standardColumns.appliedDate ? (appliedDate || today) : today,
      url: url.trim() || "#",
      notes: notes.trim(),
      cycle: activeCycle && activeCycle !== "All" ? activeCycle : undefined,
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

    // Refocus company input for seamless batch application entry
    setTimeout(() => {
      document.getElementById("new-job-company-input")?.focus();
    }, 10);
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
          <ClearableInput
            key="company"
            id="new-job-company-input"
            type="text"
            list="jobform-companies-datalist"
            placeholder="Company *"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500 transition-colors"
            containerClassName="w-full"
            required
          />
        );
      case "role":
        return (
          <ClearableInput
            key="role"
            type="text"
            list="jobform-roles-datalist"
            placeholder="Role *"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500 transition-colors"
            containerClassName="w-full"
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
              <option key={s} value={s} className={`font-medium ${getStatusOptionClass(s)}`}>
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
          <ClearableInput
            key="url"
            type="text"
            placeholder="Posting URL"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500 transition-colors font-mono"
            containerClassName="w-full"
          />
        );
      case "notes":
        if (!activeCustomMap.has("notes")) return null;
        return (
          <ClearableInput
            key="notes"
            type="text"
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500 transition-colors"
            containerClassName="w-full"
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
          <ClearableInput
            key={colId}
            type={customField.type === "number" ? "number" : "text"}
            placeholder={customField.name}
            value={fieldValues[colId] || ""}
            onChange={(e) => handleFieldValueChange(colId, e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500 transition-colors"
            containerClassName="w-full"
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
        <div className="mb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-200 text-xs">
          <div className="flex items-start gap-2.5 min-w-0">
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
          {onOpenJob && (
            <button
              type="button"
              onClick={() => onOpenJob(duplicateJob)}
              className="shrink-0 self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 hover:text-white font-medium border border-amber-400/40 transition-colors cursor-pointer text-xs"
            >
              <span>View Application</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          )}
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

        {/* Datalists for autocomplete */}
        {existingCompanies.length > 0 && (
          <datalist id="jobform-companies-datalist">
            {existingCompanies.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        )}
        {existingRoles.length > 0 && (
          <datalist id="jobform-roles-datalist">
            {existingRoles.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        )}
      </form>
    </section>
  );
}
