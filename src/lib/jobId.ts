import type { JobApplication } from "@/types/job";

export const KNOWN_ALIAS_GROUPS: string[][] = [
  // Canadian Banks & Financial
  ["cibc", "canadian imperial bank of commerce", "cibc world markets", "cibc capital markets"],
  ["rbc", "royal bank of canada", "rbc royal bank", "rbc capital markets"],
  ["td", "toronto dominion bank", "toronto dominion", "td bank", "td bank group", "td securities"],
  ["bmo", "bank of montreal", "bmo financial group", "bmo capital markets"],
  ["scotiabank", "bank of nova scotia", "the bank of nova scotia"],
  ["nbc", "national bank of canada"],
  ["manulife", "the manufacturers life insurance company", "manulife financial", "manulife canada"],
  ["sun life", "sun life financial", "sun life canada"],
  ["otpp", "ontario teachers pension plan"],
  ["cppib", "cpp investments", "canada pension plan investment board"],

  // Global Tech, Consulting & Enterprise
  ["aws", "amazon web services"],
  ["ibm", "international business machines"],
  ["ey", "ernst and young", "ernst young"],
  ["pwc", "pricewaterhousecoopers"],
  ["kpmg", "kpmg"],
  ["deloitte", "deloitte touche tohmatsu"],
  ["hpe", "hewlett packard enterprise"],
  ["hp", "hewlett packard"],
  ["meta", "facebook"],
  ["alphabet", "google"],
  ["sap", "sap se"],
];

/**
 * Normalizes a company name for fuzzy matching by removing common legal fluff,
 * recruiting/staffing noise, technology tags, and punctuation.
 */
export function cleanCompanyForMatch(name?: string): string {
  if (!name || typeof name !== "string") return "";
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/['’]/g, "")
    .replace(/[&]/g, " and ")
    .replace(
      /\b(inc|incorporated|corp|corporation|llc|ltd|limited|co|company|technologies|technology|tech|group|holdings|services|recruiting|recruitment|talent|solutions|careers|canada|usa|global|international|us|ca|bank)\b/gi,
      " "
    )
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Computes the acronym/initials of a company name (ignoring common minor filler words).
 * e.g. "Canadian Imperial Bank of Commerce" -> "cibc"
 * e.g. "Royal Bank of Canada" -> "rbc"
 */
export function getCompanyInitials(name?: string): string {
  if (!name || typeof name !== "string") return "";
  const STOP_WORDS = new Set(["of", "and", "the", "for", "in", "a", "an", "&"]);
  const words = name
    .replace(/[-/]/g, " ")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w.toLowerCase()));
  if (words.length <= 1) return "";
  return words.map((w) => w[0]).join("").toLowerCase();
}

function matchesAliasGroup(name: string, group: string[]): boolean {
  const c = cleanCompanyForMatch(name);
  const initials = getCompanyInitials(name);
  for (const alias of group) {
    const aClean = cleanCompanyForMatch(alias);
    if (!aClean) continue;
    if (c === aClean || (initials && initials === aClean)) return true;
    if (aClean.length >= 3 && (c.startsWith(aClean + " ") || aClean.startsWith(c + " "))) return true;
  }
  return false;
}

/**
 * Checks if two company names belong to the same known alias group.
 */
export function areKnownAliases(name1?: string, name2?: string): boolean {
  if (!name1 || !name2) return false;
  for (const group of KNOWN_ALIAS_GROUPS) {
    if (matchesAliasGroup(name1, group) && matchesAliasGroup(name2, group)) {
      return true;
    }
  }
  return false;
}

interface ExistingCompanyEntry {
  name: string;
  count: number;
  latestIndex: number;
}

/**
 * Finds the best matching company name from the user's past application history.
 * If a past match is found (by exact name, stripped legal/recruiting fluff, acronym, or enterprise alias),
 * returns the user's preferred existing formatting.
 * If no match is found (first-time company), returns the scraped company as-is.
 */
export function findBestMatchingCompany(
  scrapedCompany?: string,
  existingApplications: Array<{ company?: string }> = []
): string {
  if (!scrapedCompany || typeof scrapedCompany !== "string") return "";
  const rawScraped = scrapedCompany.trim();
  if (!rawScraped || !Array.isArray(existingApplications) || existingApplications.length === 0) {
    return rawScraped;
  }

  // Aggregate user's past companies by frequency and recency
  const companyMap = new Map<string, ExistingCompanyEntry>();
  existingApplications.forEach((app, idx) => {
    const raw = (app.company || "").trim();
    if (!raw) return;
    const existing = companyMap.get(raw);
    if (existing) {
      existing.count++;
    } else {
      companyMap.set(raw, { name: raw, count: 1, latestIndex: idx });
    }
  });

  if (companyMap.size === 0) return rawScraped;

  const scrapedClean = cleanCompanyForMatch(rawScraped);
  const scrapedInitials = getCompanyInitials(rawScraped);

  // Check for acronym in parentheses e.g. "Canadian Imperial Bank of Commerce (CIBC)"
  const parensMatch = rawScraped.match(/\(([^)]+)\)/);
  const scrapedParensText = parensMatch ? cleanCompanyForMatch(parensMatch[1]) : "";

  interface CandidateMatch {
    name: string;
    score: number;
    count: number;
    latestIndex: number;
  }

  const candidates: CandidateMatch[] = [];

  for (const entry of companyMap.values()) {
    const existingRaw = entry.name;
    const existingLower = existingRaw.toLowerCase();
    const existingClean = cleanCompanyForMatch(existingRaw);
    const existingInitials = getCompanyInitials(existingRaw);

    let score = 0;

    // 1. Exact case-insensitive match
    if (existingLower === rawScraped.toLowerCase()) {
      score = 1000;
    }
    // 2. Clean match without legal/recruiting/corporate fluff (e.g. "Example Ltd" vs "Example")
    else if (existingClean && scrapedClean && existingClean === scrapedClean) {
      score = 800;
    }
    // 3. Initials / Acronym match (e.g. "Canadian Imperial Bank of Commerce" vs "CIBC")
    else if (
      (scrapedInitials && existingClean && scrapedInitials === existingClean) ||
      (existingInitials && scrapedClean && existingInitials === scrapedClean) ||
      (scrapedParensText && existingClean && scrapedParensText === existingClean) ||
      (scrapedParensText && existingInitials && scrapedParensText === existingInitials)
    ) {
      score = 600;
    }
    // 4. Known enterprise aliases
    else if (areKnownAliases(rawScraped, existingRaw)) {
      score = 500;
    }
    // 5. Whole-word prefix match for sub-brands (e.g. "Example Digital" vs "Example")
    else if (
      (scrapedClean.length >= 3 && existingClean.length >= 3) &&
      (scrapedClean.startsWith(existingClean + " ") || existingClean.startsWith(scrapedClean + " "))
    ) {
      score = 300;
    }

    if (score >= 300) {
      candidates.push({
        name: entry.name,
        score,
        count: entry.count,
        latestIndex: entry.latestIndex,
      });
    }
  }

  if (candidates.length === 0) {
    return rawScraped;
  }

  // Sort by score (desc), then frequency (desc), then recency (latestIndex asc)
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.count !== a.count) return b.count - a.count;
    return a.latestIndex - b.latestIndex;
  });

  return candidates[0].name;
}

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
      "jobopeningid",
      "job_opening_id",
      "postingid",
      "posting_id",
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

  // Fitzii / ATS apply path: /apply/(\d{4,}) or /jobs/(\d{4,})
  const applyMatch = url.match(/\/(?:apply|jobs|posting)\/(\d{4,})(?:[/?#]|$)/i);
  if (applyMatch) return applyMatch[1];

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

/**
 * Normalizes role title for comparison by stripping parentheses (remote, intern, etc.)
 * and removing non-alphanumeric characters.
 */
export function cleanRole(s?: string): string {
  return (s || "")
    .replace(/\s*\([^)]*\)/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Strips tracking query parameters while preserving structural/job-identifying query parameters.
 */
export function cleanUrl(u?: string): string {
  if (!u || u === "#") return "";
  try {
    const parsed = new URL(u.startsWith("http") ? u : `https://${u}`);
    const trackingParams = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "fbclid",
      "gclid",
      "source",
      "gh_src",
      "mode",
      "iis",
      "iisn",
    ]);
    const keysToDelete: string[] = [];
    for (const [key] of parsed.searchParams.entries()) {
      if (trackingParams.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((k) => parsed.searchParams.delete(k));
    const search = parsed.searchParams.toString();
    const hostAndPath = `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "")}`;
    return search ? `${hostAndPath}?${search}` : hostAndPath;
  } catch {
    return u
      .trim()
      .replace(/^https?:\/\/(?:www\.)?/, "")
      .split("?")[0]
      .replace(/\/+$/, "");
  }
}

/**
 * Maximum days between applications to be flagged as a duplicate (~3 months).
 * Applications beyond this window represent different hiring terms or cycles.
 */
export const MAX_DUPLICATE_DAYS = 90;

export function getDaysBetween(dateStr1?: string, dateStr2?: string): number | null {
  if (!dateStr1 || !dateStr2) return null;
  const clean1 = dateStr1.split("T")[0];
  const clean2 = dateStr2.split("T")[0];
  const d1 = new Date(clean1).getTime();
  const d2 = new Date(clean2).getTime();
  if (isNaN(d1) || isNaN(d2)) return null;
  return Math.abs(Math.round((d1 - d2) / (1000 * 60 * 60 * 24)));
}

/**
 * Returns YYYY-MM-DD formatted string in the user's local timezone.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    appliedDate?: string;
    applied_date?: string;
    customFields?: Record<string, string>;
    custom_fields?: Record<string, string>;
  },
  existing: JobApplication | {
    id?: string;
    company?: string;
    role?: string;
    url?: string;
    appliedDate?: string;
    applied_date?: string;
    jobId?: string;
    customFields?: Record<string, string>;
    custom_fields?: Record<string, string>;
  }
): boolean {
  // 1. Role mismatch check:
  // If BOTH applications specify a role, and the roles are distinctly different,
  // they are separate positions and cannot be duplicates.
  const tRole = cleanRole(target.role);
  const eRole = cleanRole(existing.role);
  if (tRole && eRole && tRole !== eRole) {
    return false;
  }

  // 2. Date difference check:
  // Duplicates are only relevant within a recent window (last ~3 months / 90 days).
  // Applying to a role after several months represents a new hiring cycle or term.
  const tDate = target.appliedDate || target.applied_date || getLocalDateString();
  const eDate = existing.appliedDate || (existing as any).applied_date;
  if (eDate) {
    const diffDays = getDaysBetween(tDate, eDate);
    if (diffDays !== null && diffDays > MAX_DUPLICATE_DAYS) {
      return false;
    }
  }

  const tComp = cleanStr(target.company);
  const eComp = cleanStr(existing.company);

  // If company names are both provided and completely different, cannot be duplicate
  if (
    tComp &&
    eComp &&
    tComp !== eComp &&
    !tComp.includes(eComp) &&
    !eComp.includes(tComp) &&
    cleanCompanyForMatch(target.company) !== cleanCompanyForMatch(existing.company) &&
    !areKnownAliases(target.company, existing.company)
  ) {
    return false;
  }

  // 3. Direct URL match
  const tUrl = cleanUrl(target.url);
  const eUrl = cleanUrl(existing.url);
  if (tUrl && eUrl && tUrl === eUrl) return true;

  // 4. Job ID check
  const tId = (
    target.jobId ||
    target.customFields?.jobId ||
    target.custom_fields?.jobId ||
    extractJobIdFromUrl(target.url) ||
    ""
  ).trim().toUpperCase();

  const eId = (getEffectiveJobId(existing) || "").trim().toUpperCase();

  if (tId && eId) {
    if (tId === eId) {
      const isPureDigits = /^\d+$/.test(tId);
      if (isPureDigits) {
        // Must have company or role affinity to prevent pure-number collision
        const compMatch = !tComp || !eComp || tComp.includes(eComp) || eComp.includes(tComp);
        const roleMatch = !tRole || !eRole || tRole === eRole;
        if (compMatch || roleMatch) return true;
      } else {
        return true;
      }
    } else {
      // Both jobs provide distinct Job/Requisition IDs; they represent separate openings
      return false;
    }
  }

  // 5. Exact Company + Role match
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
    appliedDate?: string;
    applied_date?: string;
    customFields?: Record<string, string>;
    custom_fields?: Record<string, string>;
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
