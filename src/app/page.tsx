"use client";
import { useState, useEffect, useCallback } from "react";
import type { ApplicationStatus, JobApplication } from "@/types/job";
import StatsBanner from "@/components/StatsBanner";
import JobForm, { type NewJobPayload } from "@/components/JobForm";
import JobTable from "@/components/JobTable";
import Navbar from "@/components/Navbar";
import AuthModal from "@/components/AuthModal";
import ScrollNav from "@/components/ScrollNav";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { extractJobIdFromUrl } from "@/lib/jobId";

const GUEST_STORAGE_KEY = "job_tracker_guest_jobs";

export default function Home() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [jobs, setJobs] = useState<Record<string, JobApplication>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Helper to persist to localStorage in guest mode
  const saveGuestJobs = (updated: Record<string, JobApplication>) => {
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
    }
  };

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);

    if (!user) {
      // Guest Mode: load from localStorage
      try {
        const local = localStorage.getItem(GUEST_STORAGE_KEY);
        if (local) {
          setJobs(JSON.parse(local));
        } else {
          setJobs({});
        }
      } catch {
        setJobs({});
      }
      setIsLoading(false);
      return;
    }

    // Authenticated Mode: check if guest jobs need migrating first
    try {
      const guestData = localStorage.getItem(GUEST_STORAGE_KEY);
      if (guestData) {
        const parsedGuest = JSON.parse(guestData) as Record<string, JobApplication>;
        const guestList = Object.values(parsedGuest);

        if (guestList.length > 0) {
          const rowsToMigrate = guestList.map((job) => {
            const mergedCustom: Record<string, unknown> = { ...(job.customFields || {}) };
            if (job.keyRequirements) {
              mergedCustom._keyRequirements = JSON.stringify(job.keyRequirements);
            }
            return {
              id: job.id,
              user_id: user.id,
              company: job.company,
              role: job.role,
              status: job.status,
              applied_date: job.appliedDate,
              url: job.url,
              notes: job.notes,
              salary: job.salary || "",
              location: job.location || "",
              deadline_date: job.deadlineDate || "",
              custom_fields: mergedCustom,
            };
          });

          let { error: migError } = await supabase.from("applications").insert(rowsToMigrate);
          if (migError && migError.message?.includes("custom_fields")) {
            const fallback = rowsToMigrate.map(({ custom_fields, ...rest }) => rest);
            await supabase.from("applications").insert(fallback);
          }
          localStorage.removeItem(GUEST_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error("Failed to migrate guest applications to account:", e);
    }

    // Load full applications list from Supabase
    try {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .order("applied_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching applications:", error.message);
        return;
      }

      if (data) {
        const map: Record<string, JobApplication> = {};
        for (const row of data) {
          let parsedRequirements: string[] | undefined = undefined;
          let cleanedCustomFields: Record<string, string> | undefined = undefined;

          if (row.custom_fields && typeof row.custom_fields === "object") {
            const cf = { ...row.custom_fields };
            if (cf._keyRequirements) {
              try {
                parsedRequirements = JSON.parse(cf._keyRequirements);
              } catch {
                // ignore
              }
              delete cf._keyRequirements;
            }
            if (cf._highlights) {
              // Backward-compatibility: if user had requirements under old key
              try {
                const old = JSON.parse(cf._highlights);
                if (Array.isArray(old?.requirements)) {
                  parsedRequirements = old.requirements;
                }
              } catch {
                // ignore
              }
              delete cf._highlights;
            }
            if (Object.keys(cf).length > 0) {
              cleanedCustomFields = cf;
            }
          }

          const extractedJobId =
            row.job_id ||
            cleanedCustomFields?.jobId ||
            cleanedCustomFields?.job_id ||
            extractJobIdFromUrl(row.url) ||
            undefined;

          map[row.id] = {
            id: row.id,
            userId: row.user_id,
            company: row.company,
            role: row.role,
            status: row.status,
            appliedDate: row.applied_date,
            url: row.url || "#",
            notes: row.notes || "",
            salary: row.salary || undefined,
            location: row.location || undefined,
            deadlineDate: row.deadline_date || undefined,
            jobId: extractedJobId,
            customFields: cleanedCustomFields,
            keyRequirements: parsedRequirements,
          };
        }
        setJobs(map);
      }
    } catch (err) {
      console.error("Failed to connect to database:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchApplications();
    }
  }, [isAuthLoading, fetchApplications]);

  const jobList = Object.values(jobs);
  const totalCount = jobList.length;
  const interviewCount = jobList.filter((j) => j.status === "Interview").length;
  const offerCount = jobList.filter((j) => j.status === "Offer").length;
  const rejectedCount = jobList.filter((j) => j.status === "Rejected").length;

  async function handleAddJob(payload: NewJobPayload) {
    const today = new Date().toISOString().split("T")[0];
    const newId = crypto.randomUUID();
    const appliedDate = payload.appliedDate || today;

    const effectiveJobId = payload.jobId || payload.customFields?.jobId || extractJobIdFromUrl(payload.url) || undefined;

    const newJob: JobApplication = {
      id: newId,
      userId: user?.id,
      company: payload.company,
      role: payload.role,
      status: payload.status,
      appliedDate,
      url: payload.url,
      notes: payload.notes,
      salary: payload.salary,
      location: payload.location,
      deadlineDate: payload.deadlineDate,
      jobId: effectiveJobId,
      customFields: payload.customFields,
      keyRequirements: payload.keyRequirements,
    };

    // Update state immediately
    const nextJobs = { ...jobs, [newId]: newJob };
    setJobs(nextJobs);

    if (!user) {
      // Guest Mode: save locally
      saveGuestJobs(nextJobs);
      return;
    }

    // Authenticated: insert into Supabase
    try {
      const dbRow: Record<string, unknown> = {
        id: newId,
        user_id: user.id,
        company: payload.company,
        role: payload.role,
        status: payload.status,
        applied_date: appliedDate,
        url: payload.url,
        notes: payload.notes,
      };
      if (payload.salary) dbRow.salary = payload.salary;
      if (payload.location) dbRow.location = payload.location;
      if (payload.deadlineDate) dbRow.deadline_date = payload.deadlineDate;

      if (effectiveJobId || payload.customFields || payload.keyRequirements) {
        const mergedCustom: Record<string, unknown> = { ...(payload.customFields || {}) };
        if (effectiveJobId) {
          mergedCustom.jobId = effectiveJobId;
        }
        if (payload.keyRequirements) {
          mergedCustom._keyRequirements = JSON.stringify(payload.keyRequirements);
        }
        dbRow.custom_fields = mergedCustom;
      }

      let { error } = await supabase.from("applications").insert([dbRow]);
      if (error && error.message?.includes("custom_fields")) {
        delete dbRow.custom_fields;
        error = (await supabase.from("applications").insert([dbRow])).error;
      }

      if (error) {
        console.error("Error creating application in database:", error.message);
      }
    } catch (err) {
      console.error("Failed to insert job into database:", err);
    }
  }

  async function handleStatusChange(id: string, newStatus: ApplicationStatus) {
    const nextJobs = {
      ...jobs,
      [id]: {
        ...jobs[id],
        status: newStatus,
      },
    };
    setJobs(nextJobs);

    if (!user) {
      saveGuestJobs(nextJobs);
      return;
    }

    try {
      const { error } = await supabase
        .from("applications")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) {
        console.error("Error updating status in database:", error.message);
      }
    } catch (err) {
      console.error("Failed to update status in database:", err);
    }
  }

  async function handleSaveEdit(id: string, updated: Partial<JobApplication>) {
    const nextJobs = {
      ...jobs,
      [id]: {
        ...jobs[id],
        ...updated,
      },
    };
    setJobs(nextJobs);

    if (!user) {
      saveGuestJobs(nextJobs);
      return;
    }

    try {
      const dbPayload: Record<string, unknown> = {};
      if (updated.company !== undefined) dbPayload.company = updated.company;
      if (updated.role !== undefined) dbPayload.role = updated.role;
      if (updated.status !== undefined) dbPayload.status = updated.status;
      if (updated.appliedDate !== undefined) dbPayload.applied_date = updated.appliedDate;
      if (updated.url !== undefined) dbPayload.url = updated.url;
      if (updated.notes !== undefined) dbPayload.notes = updated.notes;
      if (updated.salary !== undefined) dbPayload.salary = updated.salary;
      if (updated.location !== undefined) dbPayload.location = updated.location;
      if (updated.deadlineDate !== undefined) dbPayload.deadline_date = updated.deadlineDate;

      if (updated.jobId !== undefined || updated.customFields !== undefined || updated.keyRequirements !== undefined) {
        const mergedCustom: Record<string, unknown> = {
          ...(jobs[id]?.customFields || {}),
          ...(updated.customFields || {}),
        };
        if (updated.jobId !== undefined) {
          mergedCustom.jobId = updated.jobId;
        }
        const requirementsToSave =
          updated.keyRequirements !== undefined ? updated.keyRequirements : jobs[id]?.keyRequirements;
        if (requirementsToSave) {
          mergedCustom._keyRequirements = JSON.stringify(requirementsToSave);
        }
        dbPayload.custom_fields = mergedCustom;
      }

      let { error } = await supabase
        .from("applications")
        .update(dbPayload)
        .eq("id", id);

      if (error && error.message?.includes("custom_fields")) {
        delete dbPayload.custom_fields;
        error = (await supabase.from("applications").update(dbPayload).eq("id", id)).error;
      }

      if (error) {
        console.error("Error updating application in database:", error.message);
      }
    } catch (err) {
      console.error("Failed to update application in database:", err);
    }
  }

  async function handleDeleteJob(id: string) {
    const nextJobs = { ...jobs };
    delete nextJobs[id];
    setJobs(nextJobs);

    if (!user) {
      saveGuestJobs(nextJobs);
      return;
    }

    try {
      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting application in database:", error.message);
      }
    } catch (err) {
      console.error("Failed to delete application from database:", err);
    }
  }

  async function handleDeleteJobs(ids: string[]) {
    if (ids.length === 0) return;
    const nextJobs = { ...jobs };
    ids.forEach((id) => delete nextJobs[id]);
    setJobs(nextJobs);

    if (!user) {
      saveGuestJobs(nextJobs);
      return;
    }

    try {
      const { error } = await supabase
        .from("applications")
        .delete()
        .in("id", ids);

      if (error) {
        console.error("Error bulk deleting applications in database:", error.message);
      }
    } catch (err) {
      console.error("Failed to bulk delete applications from database:", err);
    }
  }

  async function handleImportJobs(newJobsMap: Record<string, JobApplication>) {
    const jobArray = Object.values(newJobsMap);
    if (jobArray.length === 0) return;

    const nextJobs = {
      ...jobs,
      ...newJobsMap,
    };
    setJobs(nextJobs);

    if (!user) {
      saveGuestJobs(nextJobs);
      return;
    }

    try {
      const rowsToInsert = jobArray.map((job) => ({
        id: job.id,
        user_id: user.id,
        company: job.company,
        role: job.role,
        status: job.status,
        applied_date: job.appliedDate,
        url: job.url,
        notes: job.notes,
        salary: job.salary || "",
        location: job.location || "",
        deadline_date: job.deadlineDate || "",
        custom_fields: job.customFields || {},
      }));

      let { error } = await supabase
        .from("applications")
        .insert(rowsToInsert);

      if (error && error.message?.includes("custom_fields")) {
        const fallbackRows = rowsToInsert.map(({ custom_fields, ...rest }) => rest);
        error = (await supabase.from("applications").insert(fallbackRows)).error;
      }

      if (error) {
        console.error("Error saving imported jobs to database:", error.message);
      }
    } catch (err) {
      console.error("Failed to insert imported jobs into database:", err);
    }
  }

  async function handleMigrateStatus(oldStatus: string, newStatus: string) {
    const nextJobs = { ...jobs };
    let hasChanges = false;
    for (const id in nextJobs) {
      if (nextJobs[id].status === oldStatus) {
        nextJobs[id] = { ...nextJobs[id], status: newStatus as ApplicationStatus };
        hasChanges = true;
      }
    }
    if (!hasChanges) return;
    setJobs(nextJobs);

    if (!user) {
      saveGuestJobs(nextJobs);
      return;
    }

    try {
      const { error } = await supabase
        .from("applications")
        .update({ status: newStatus })
        .eq("status", oldStatus)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error migrating status in database:", error.message);
      }
    } catch (err) {
      console.error("Failed to migrate status in database:", err);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex flex-col">
      <Navbar jobs={jobList} onMigrateStatus={handleMigrateStatus} />

      <main className="p-3 sm:p-8 max-w-7xl mx-auto w-full flex-1">
        {/* Guest Mode Banner */}
        {!user && !isAuthLoading && (
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4 rounded-lg border border-[#30363d] bg-[#161b22] px-3.5 sm:px-4 py-2.5 text-xs text-[#8b949e]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#58a6ff] shrink-0"></span>
              <span>
                <strong className="text-[#c9d1d9] font-medium">Guest mode:</strong> Data is saved locally in this browser.
              </span>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="text-[#58a6ff] hover:underline font-medium shrink-0 text-left"
            >
              Sign in to sync across devices →
            </button>
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f0f6fc]">
            Dashboard
          </h1>
          <p className="text-xs text-[#8b949e] mt-0.5">
            Track and manage your job applications
          </p>
        </div>

        <StatsBanner
          total={totalCount}
          interviews={interviewCount}
          offers={offerCount}
          rejected={rejectedCount}
        />

        <JobForm onAddJob={handleAddJob} existingJobs={jobList} />

        {isLoading ? (
          <div className="p-12 text-center text-[#8b949e]">
            <div className="inline-block w-5 h-5 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin mb-2"></div>
            <p className="text-xs">Loading applications...</p>
          </div>
        ) : (
          <JobTable
            jobs={jobList}
            onStatusChange={handleStatusChange}
            onSaveEdit={handleSaveEdit}
            onDeleteJob={handleDeleteJob}
            onDeleteJobs={handleDeleteJobs}
            onImportJobs={handleImportJobs}
          />
        )}
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <ScrollNav />
    </div>
  );
}