import type { JobApplication } from "@/types/job";

/**
 * Extracts a Requisition or Job ID from a job posting URL.
 * Supports Workday (e.g. JR26081665, R-12345), Greenhouse, Lever,
 * LinkedIn, Indeed, and common query parameters (jobId, reqId, etc.).
 */
export function extractJobIdFromUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const url = rawUrl.trim();
  if (url === "#" || url === "" || url.toLowerCase() === "n/a") return null;

  // 1. Explicit enterprise requisition pattern anywhere in path/slug (e.g. JR26081665, REQ-12345, R-12345)
  const reqMatch = url.match(/(?:_|\/|-|\b)(JR\d{4,}|REQ-?\d{4,}|R-?\d{4,})(?:[/?#&_\s]|$)/i);
  if (reqMatch) return reqMatch[1].toUpperCase();

  // 2. Query param IDs (jobId, reqId, requisitionId, gh_jid, jk, currentJobId, etc.)
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const qParams = [
      "jobid",
      "job_id",
      "reqid",
      "req_id",
      "requisitionid",
      "requisition_id",
      "gh_jid",
      "jk",
      "currentjobid",
      "id",
    ];
    for (const [k, v] of parsed.searchParams.entries()) {
      if (qParams.includes(k.toLowerCase()) && v && v.length >= 3) {
        return v;
      }
    }
  } catch {}

  // 3. Known ATS path structures
  // Greenhouse: /jobs/(\d+)
  const ghMatch = url.match(/\/jobs\/(\d{5,})/i);
  if (ghMatch) return ghMatch[1];

  // Lever: /jobs/([a-f0-9-]{36})
  const leverMatch = url.match(/\/jobs\/([a-f0-9-]{36})/i);
  if (leverMatch) return leverMatch[1];

  // LinkedIn: /jobs/view/(\d+)
  const liMatch = url.match(/\/jobs\/view\/(\d{6,})/i);
  if (liMatch) return liMatch[1];

  // Workday slug ending with ID: /job/.../[slug]_[id]
  const wdSlugMatch = url.match(/_([A-Za-z0-9]{5,})(?:[/?#]|$)/);
  if (wdSlugMatch) return wdSlugMatch[1];

  return null;
}

/**
 * Gets the effective Job ID of an application from explicit field,
 * custom fields, or URL extraction fallback.
 */
export function getEffectiveJobId(job: {
  jobId?: string;
  customFields?: Record<string, string>;
  url?: string;
}): string | null {
  if (job.jobId && job.jobId.trim()) return job.jobId.trim();
  if (job.customFields) {
    if (job.customFields.jobId && job.customFields.jobId.trim()) return job.customFields.jobId.trim();
    if (job.customFields.job_id && job.customFields.job_id.trim()) return job.customFields.job_id.trim();
    if (job.customFields.requisition_id && job.customFields.requisition_id.trim()) {
      return job.customFields.requisition_id.trim();
    }
  }
  return extractJobIdFromUrl(job.url);
}

function cleanStr(s?: string): string {
  return (s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanUrl(u?: string): string {
  if (!u || u === "#") return "";
  return u
    .trim()
    .replace(/^https?:\/\/(?:www\.)?/, "")
    .split("?")[0]
    .replace(/\/+$/, "");
}

/**
 * Formats ISO / YYYY-MM-DD date nicely into [Oct 14, 2026] or [2026-10-14]
 */
export function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return "Unknown date";
  const clean = dateStr.split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mIdx = parseInt(parts[1], 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${months[mIdx]} ${parseInt(parts[2], 10)}, ${parts[0]}`;
    }
  }
  return clean;
}

/**
 * Checks whether target job matches an existing job application.
 */
export function isDuplicateJob(
  target: {
    company?: string;
    role?: string;
    url?: string;
    jobId?: string;
    customFields?: Record<string, string>;
  },
  existing: JobApplication
): boolean {
  // 1. Direct URL match
  const tUrl = cleanUrl(target.url);
  const eUrl = cleanUrl(existing.url);
  if (tUrl && eUrl && tUrl === eUrl) return true;

  // 2. Job ID match
  const tId = (target.jobId || target.customFields?.jobId || extractJobIdFromUrl(target.url) || "")
    .trim()
    .toUpperCase();
  const eId = (getEffectiveJobId(existing) || "").trim().toUpperCase();

  const tComp = cleanStr(target.company);
  const eComp = cleanStr(existing.company);
  const tRole = cleanStr(target.role);
  const eRole = cleanStr(existing.role);

  if (tId && eId && tId === eId) {
    const isPureDigits = /^\d+$/.test(tId);
    if (isPureDigits) {
      // Must be combined with company or role to prevent pure-number collision
      const compMatch = tComp && eComp && (tComp.includes(eComp) || eComp.includes(tComp));
      const roleMatch = tRole && eRole && (tRole.includes(eRole) || eRole.includes(tRole));
      if (compMatch || roleMatch) return true;
    } else {
      // Distinct alphanumeric ID (like JR26081665)
      if (tComp && eComp && tComp !== eComp && !tComp.includes(eComp) && !eComp.includes(tComp)) {
        // Companies provided and totally different - do not match
      } else {
        return true;
      }
    }
  }

  // 3. Exact Company + Role match
  if (tComp && eComp && tRole && eRole) {
    if (tComp === eComp && tRole === eRole) return true;
  }

  return false;
}

/**
 * Finds duplicate job in existing list, optionally ignoring a job by id (for editing).
 */
export function findDuplicateJob(
  target: {
    company?: string;
    role?: string;
    url?: string;
    jobId?: string;
    customFields?: Record<string, string>;
  },
  existingJobs: JobApplication[],
  ignoreId?: string
): JobApplication | null {
  for (const job of existingJobs) {
    if (ignoreId && job.id === ignoreId) continue;
    if (isDuplicateJob(target, job)) {
      return job;
    }
  }
  return null;
}

/**
 * Returns formatted user-facing message, e.g.:
 * "This was already applied to (ID: JR26081665) [Applied: Oct 14, 2026]"
 */
export function formatDuplicateMessage(
  existing: JobApplication,
  matchedId?: string | null
): string {
  const displayId = matchedId || getEffectiveJobId(existing);
  const displayDate = formatDateDisplay(existing.appliedDate);

  if (displayId) {
    return `This was already applied to (ID: ${displayId}) [Applied: ${displayDate}]`;
  }
  return `This was already applied to [Applied: ${displayDate}]`;
}
