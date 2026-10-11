"use client";
import { useState, useEffect } from "react";
import type { ApplicationStatus, JobApplication } from "@/types/job";
import StatsBanner from "@/components/StatsBanner";
import JobForm, { type NewJobPayload } from "@/components/JobForm";
import JobTable from "@/components/JobTable";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [jobs, setJobs] = useState<Record<string, JobApplication>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchApplications() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("applications")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching applications:", error.message);
          return;
        }

        if (data) {
          const map: Record<string, JobApplication> = {};
          for (const row of data) {
            map[row.id] = {
              id: row.id,
              company: row.company,
              role: row.role,
              status: row.status,
              appliedDate: row.applied_date,
              url: row.url || "#",
              notes: row.notes || "",
            };
          }
          setJobs(map);
        }
      } catch (err) {
        console.error("Failed to connect to Supabase:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchApplications();
  }, []);

  const jobList = Object.values(jobs);
  const totalCount = jobList.length;
  const interviewCount = jobList.filter((j) => j.status === "Interview").length;
  const offerCount = jobList.filter((j) => j.status === "Offer").length;
  const rejectedCount = jobList.filter((j) => j.status === "Rejected").length;

  async function handleAddJob(payload: NewJobPayload) {
    const today = new Date().toISOString().split("T")[0];
    const newId = crypto.randomUUID();

    try {
      const { data, error } = await supabase
        .from("applications")
        .insert([
          {
            id: newId,
            company: payload.company,
            role: payload.role,
            status: payload.status,
            applied_date: today,
            url: payload.url,
            notes: payload.notes,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Error creating application in Supabase:", error.message);
        return;
      }

      if (data) {
        const newJob: JobApplication = {
          id: data.id,
          company: data.company,
          role: data.role,
          status: data.status,
          appliedDate: data.applied_date,
          url: data.url || "#",
          notes: data.notes || "",
        };

        setJobs((prevJobs) => ({
          ...prevJobs,
          [newJob.id]: newJob,
        }));
      }
    } catch (err) {
      console.error("Failed to insert job into Supabase:", err);
    }
  }

  async function handleStatusChange(id: string, newStatus: ApplicationStatus) {
    setJobs((prevJobs) => ({
      ...prevJobs,
      [id]: {
        ...prevJobs[id],
        status: newStatus,
      },
    }));

    try {
      const { error } = await supabase
        .from("applications")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) {
        console.error("Error updating status in Supabase:", error.message);
      }
    } catch (err) {
      console.error("Failed to update status in Supabase:", err);
    }
  }

  async function handleSaveEdit(id: string, updated: Partial<JobApplication>) {
    setJobs((prevJobs) => ({
      ...prevJobs,
      [id]: {
        ...prevJobs[id],
        ...updated,
      },
    }));

    try {
      const dbPayload: Record<string, unknown> = {};
      if (updated.company !== undefined) dbPayload.company = updated.company;
      if (updated.role !== undefined) dbPayload.role = updated.role;
      if (updated.status !== undefined) dbPayload.status = updated.status;
      if (updated.appliedDate !== undefined) dbPayload.applied_date = updated.appliedDate;
      if (updated.url !== undefined) dbPayload.url = updated.url;
      if (updated.notes !== undefined) dbPayload.notes = updated.notes;

      const { error } = await supabase
        .from("applications")
        .update(dbPayload)
        .eq("id", id);

      if (error) {
        console.error("Error updating application in Supabase:", error.message);
      }
    } catch (err) {
      console.error("Failed to update application in Supabase:", err);
    }
  }

  function handleDeleteJob(id: string) {
    setJobs((prevJobs) => {
      const updatedJobs = { ...prevJobs };
      delete updatedJobs[id];
      return updatedJobs;
    });
  }

  function handleImportJobs(newJobsMap: Record<string, JobApplication>) {
    setJobs((prevJobs) => ({
      ...prevJobs,
      ...newJobsMap,
    }));
  }

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Job Application Tracker</h1>

      <StatsBanner
        total={totalCount}
        interviews={interviewCount}
        offers={offerCount}
        rejected={rejectedCount}
      />

      <JobForm onAddJob={handleAddJob} />

      {isLoading ? (
        <div className="p-12 text-center text-zinc-400">
          <div className="inline-block w-6 h-6 border-2 border-zinc-500 border-t-zinc-100 rounded-full animate-spin mb-3"></div>
          <p className="text-sm">Connecting to cloud database...</p>
        </div>
      ) : (
        <JobTable
          jobs={jobList}
          onStatusChange={handleStatusChange}
          onSaveEdit={handleSaveEdit}
          onDeleteJob={handleDeleteJob}
          onImportJobs={handleImportJobs}
        />
      )}
    </main>
  );
}