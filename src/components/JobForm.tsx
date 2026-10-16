"use client";
import { useEffect, useState } from "react";
import type { ApplicationStatus } from "@/types/job";
import { useSettings } from "@/context/SettingsContext";

export interface NewJobPayload {
  company: string;
  role: string;
  status: ApplicationStatus;
  appliedDate?: string;
  url: string;
  notes: string;
  salary?: string;
  location?: string;
  deadlineDate?: string;
  customFields?: Record<string, string>;
  keyRequirements?: string[];
}

interface JobFormProps {
  onAddJob: (payload: NewJobPayload) => void;
}

export default function JobForm({ onAddJob }: JobFormProps) {
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
            placeholder="Company (e.g. Amazon)"
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
            placeholder="Role (e.g. Engineer)"
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
          <input
            key="appliedDate"
            type="date"
            title="Date Applied"
            value={appliedDate}
            onChange={(e) => setAppliedDate(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500 transition-colors font-mono"
          />
        );
      case "url":
        return (
          <input
            key="url"
            type="text"
            placeholder="Posting URL (optional)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500 transition-colors"
          />
        );
      case "notes":
        if (!activeCustomMap.has("notes")) return null;
        return (
          <input
            key="notes"
            type="text"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-zinc-500 transition-colors"
          />
        );
      default: {
        const customField = activeCustomMap.get(colId);
        if (!customField) return null;
        return (
          <input
            key={colId}
            type={customField.type === "date" ? "date" : customField.type === "number" ? "number" : "text"}
            placeholder={`${customField.name} (optional)`}
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
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5 sm:gap-3 items-center"
      >
        {orderedFormColIds.map((colId) => renderField(colId))}

        <button
          type="submit"
          className="bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm hover:shadow h-[38px] flex items-center justify-center whitespace-nowrap"
        >
          + Add Job
        </button>
      </form>
    </section>
  );
}
