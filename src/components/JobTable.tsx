"use client";

import { useState } from "react";
import type { ApplicationStatus, JobApplication } from "@/types/job";
import { exportApplicationsToCSV } from "@/lib/csv";
import CSVImportModal from "@/components/CSVImportModal";
import EditJobModal from "@/components/EditJobModal";
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
  const [editingJob, setEditingJob] = useState<JobApplication | null>(null);
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
              <th className="w-8 p-0"></th>
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
              filteredJobs.map((job) => (
                <tr
                  key={job.id}
                  className="group border-b border-zinc-800/80 hover:bg-zinc-800/30 transition-colors"
                >
                  {/* Left-edge Hover Slide-Out Pencil */}
                  <td className="w-8 p-0 text-center relative">
                    <button
                      type="button"
                      onClick={() => setEditingJob(job)}
                      title="Edit application"
                      className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-zinc-400 hover:text-[#58a6ff] p-1.5 rounded hover:bg-zinc-800 cursor-pointer inline-flex items-center justify-center"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  </td>

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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <EditJobModal
        job={editingJob}
        isOpen={!!editingJob}
        onClose={() => setEditingJob(null)}
        onSave={onSaveEdit}
        onDelete={onDeleteJob}
      />

      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={onImportJobs}
      />
    </div>
  );
}
