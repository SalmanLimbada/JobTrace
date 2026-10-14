"use client";
import { useState } from "react";
import type { ApplicationStatus, JobApplication } from "@/types/job";
import { exportApplicationsToCSV } from "@/lib/csv";
import CSVImportModal from "@/components/CSVImportModal";
import { useSettings } from "@/context/SettingsContext";

interface JobTableProps {
  jobs: JobApplication[];
  onStatusChange: (id: string, newStatus: ApplicationStatus) => void;
  onSaveEdit: (id: string, updated: Partial<JobApplication>) => void;
  onDeleteJob: (id: string) => void;
  onImportJobs: (newJobs: Record<string, JobApplication>, count: number) => void;
}

function formatUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed === "#" || trimmed.toLowerCase() === "n/a" || trimmed === "-") {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.includes(".")) {
    return `https://${trimmed}`;
  }
  return null;
}

function getFieldValue(job: JobApplication, fieldId: string): string | undefined {
  if (job.customFields && job.customFields[fieldId] !== undefined) {
    return job.customFields[fieldId];
  }
  if (fieldId === "salary") return job.salary;
  if (fieldId === "location") return job.location;
  if (fieldId === "deadlineDate") return job.deadlineDate;
  return undefined;
}

export default function JobTable({
  jobs,
  onStatusChange,
  onSaveEdit,
  onDeleteJob,
  onImportJobs,
}: JobTableProps) {
  const { customFields } = useSettings();
  const activeFields = customFields.filter((f) => f.enabled);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | "All">("All");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<JobApplication>>({});
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const filteredJobs = jobs.filter((job) => {
    const matchesStatus = filterStatus === "All" || job.status === filterStatus;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      job.company.toLowerCase().includes(query) ||
      job.role.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  function startEditing(job: JobApplication) {
    setEditingId(job.id);
    const initialCustom: Record<string, string> = { ...(job.customFields || {}) };
    if (job.salary && !initialCustom.salary) initialCustom.salary = job.salary;
    if (job.location && !initialCustom.location) initialCustom.location = job.location;
    if (job.deadlineDate && !initialCustom.deadlineDate) initialCustom.deadlineDate = job.deadlineDate;

    setEditForm({
      company: job.company,
      role: job.role,
      status: job.status,
      appliedDate: job.appliedDate,
      url: job.url,
      notes: job.notes,
      salary: job.salary,
      location: job.location,
      deadlineDate: job.deadlineDate,
      customFields: initialCustom,
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm({});
  }

  function handleEditCustomField(fieldId: string, value: string) {
    setEditForm((prev) => {
      const nextCustom = { ...(prev.customFields || {}), [fieldId]: value };
      const next: Partial<JobApplication> = {
        ...prev,
        customFields: nextCustom,
      };
      if (fieldId === "salary") next.salary = value;
      if (fieldId === "location") next.location = value;
      if (fieldId === "deadlineDate") next.deadlineDate = value;
      return next;
    });
  }

  function handleSave(id: string) {
    if (!editForm.company?.trim() || !editForm.role?.trim()) return;

    onSaveEdit(id, {
      company: editForm.company.trim(),
      role: editForm.role.trim(),
      status: editForm.status,
      appliedDate: editForm.appliedDate,
      url: editForm.url?.trim() || "#",
      notes: editForm.notes?.trim() || "",
      salary: editForm.salary || editForm.customFields?.["salary"],
      location: editForm.location || editForm.customFields?.["location"],
      deadlineDate: editForm.deadlineDate || editForm.customFields?.["deadlineDate"],
      customFields: editForm.customFields,
    });

    setEditingId(null);
    setEditForm({});
  }

  function handleDelete(job: JobApplication) {
    if (confirm(`Delete application for ${job.company} (${job.role})?`)) {
      onDeleteJob(job.id);
      if (editingId === job.id) {
        cancelEditing();
      }
    }
  }

  return (
    <div>
      {/* Search & Status Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between mb-4">
        <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center flex-1 max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search company or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm rounded px-3 py-2 outline-none focus:border-zinc-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => exportApplicationsToCSV(jobs, customFields)}
            className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 px-3 py-2 rounded transition-colors cursor-pointer whitespace-nowrap"
            title="Download applications as CSV"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 px-3 py-2 rounded transition-colors cursor-pointer whitespace-nowrap"
            title="Upload applications from CSV"
          >
            Import CSV
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          {(["All", "Applied", "Interview", "Offer", "Rejected", "Other"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1.5 rounded transition-colors cursor-pointer ${
                filterStatus === s
                  ? "bg-zinc-100 text-zinc-900 font-semibold"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/20 shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-zinc-900/90 text-zinc-400 text-xs uppercase font-medium border-b border-zinc-800">
            <tr>
              <th className="p-3.5">Company</th>
              <th className="p-3.5">Role</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Date Applied</th>
              {activeFields.map((f) => (
                <th key={f.id} className="p-3.5 whitespace-nowrap">
                  {f.name}
                </th>
              ))}
              <th className="p-3.5">Posting URL</th>
              <th className="p-3.5">Notes</th>
              <th className="p-3.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.length === 0 ? (
              <tr>
                <td
                  colSpan={7 + activeFields.length}
                  className="p-8 text-center text-zinc-500 text-sm"
                >
                  No job applications found matching your criteria.
                  {(searchQuery || filterStatus !== "All") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setFilterStatus("All");
                      }}
                      className="block mx-auto mt-2 text-xs text-blue-400 hover:underline cursor-pointer"
                    >
                      Clear search and filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredJobs.map((job) => {
                const isEditing = editingId === job.id;

                if (isEditing) {
                  return (
                    <tr key={job.id} className="border-b border-zinc-700 bg-zinc-900/60">
                      <td className="p-3">
                        <input
                          type="text"
                          value={editForm.company ?? ""}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, company: e.target.value }))}
                          className="bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs rounded px-2 py-1 outline-none focus:border-zinc-400 w-full"
                          required
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={editForm.role ?? ""}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                          className="bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs rounded px-2 py-1 outline-none focus:border-zinc-400 w-full"
                          required
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={editForm.status ?? job.status}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value as ApplicationStatus }))}
                          className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs px-2 py-1 rounded outline-none focus:border-zinc-400 cursor-pointer"
                        >
                          <option value="Applied">Applied</option>
                          <option value="Interview">Interview</option>
                          <option value="Offer">Offer</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="date"
                          value={editForm.appliedDate ?? job.appliedDate}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, appliedDate: e.target.value }))}
                          className="bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs rounded px-2 py-1 outline-none focus:border-zinc-400"
                        />
                      </td>
                      {activeFields.map((f) => (
                        <td key={f.id} className="p-3">
                          <input
                            type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                            value={editForm.customFields?.[f.id] ?? getFieldValue(job, f.id) ?? ""}
                            onChange={(e) => handleEditCustomField(f.id, e.target.value)}
                            placeholder={f.name}
                            className="bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs rounded px-2 py-1 outline-none focus:border-zinc-400 w-full"
                          />
                        </td>
                      ))}
                      <td className="p-3">
                        <input
                          type="text"
                          value={editForm.url ?? ""}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, url: e.target.value }))}
                          placeholder="Posting URL"
                          className="bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs rounded px-2 py-1 outline-none focus:border-zinc-400 w-full"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={editForm.notes ?? ""}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                          placeholder="Notes"
                          className="bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs rounded px-2 py-1 outline-none focus:border-zinc-400 w-full"
                        />
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleSave(job.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-2.5 py-1 rounded transition-colors mr-1.5 cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="text-zinc-400 hover:text-zinc-200 text-xs px-2 py-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={job.id} className="border-b border-zinc-800/80 hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3 font-medium text-zinc-100">{job.company}</td>
                    <td className="p-3 text-zinc-300">{job.role}</td>
                    <td className="p-3">
                      <select
                        value={job.status}
                        onChange={(e) => onStatusChange(job.id, e.target.value as ApplicationStatus)}
                        className="bg-zinc-800 text-zinc-200 text-xs px-2.5 py-1 rounded border border-zinc-700 outline-none cursor-pointer hover:border-zinc-500 transition-colors"
                      >
                        <option value="Applied">Applied</option>
                        <option value="Interview">Interview</option>
                        <option value="Offer">Offer</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Other">Other</option>
                      </select>
                    </td>
                    <td className="p-3 text-zinc-400 text-xs">{job.appliedDate}</td>
                    {activeFields.map((f) => {
                      const val = getFieldValue(job, f.id);
                      return (
                        <td
                          key={f.id}
                          className={`p-3 text-xs ${
                            f.type === "date" ? "text-zinc-400 font-mono" : "text-zinc-300"
                          }`}
                        >
                          {val || <span className="text-zinc-600">—</span>}
                        </td>
                      );
                    })}
                    <td className="p-3">
                      {(() => {
                        const validUrl = formatUrl(job.url);
                        return validUrl ? (
                          <a
                            href={validUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 hover:underline text-xs inline-flex items-center gap-1 font-medium"
                          >
                            View Post ↗
                          </a>
                        ) : (
                          <span className="text-zinc-600 text-xs font-mono">—</span>
                        );
                      })()}
                    </td>
                    <td className="p-3 text-zinc-400 text-xs max-w-xs truncate" title={job.notes}>
                      {job.notes || <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => startEditing(job)}
                        className="text-zinc-400 hover:text-zinc-100 text-xs px-2.5 py-1 rounded hover:bg-zinc-800 transition-colors mr-1.5 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(job)}
                        className="text-zinc-500 hover:text-red-400 text-xs px-2.5 py-1 rounded hover:bg-red-950/30 transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={onImportJobs}
      />
    </div>
  );
}
