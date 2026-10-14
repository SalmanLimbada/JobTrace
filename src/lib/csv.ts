import type { ApplicationStatus, CustomFieldDefinition, JobApplication } from "@/types/job";

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

export function exportApplicationsToCSV(
  jobs: JobApplication[],
  customFields?: CustomFieldDefinition[]
): void {
  const activeCustom = (customFields || []).filter((f) => f.enabled);
  const headers = [
    "Company",
    "Role",
    "Status",
    "Date Applied",
    ...activeCustom.map((f) => f.name),
    "Posting URL",
    "Notes",
  ];

  const rows = jobs.map((job) => {
    const customValues = activeCustom.map((f) => {
      let val = job.customFields?.[f.id];
      if (val === undefined) {
        if (f.id === "salary") val = job.salary;
        else if (f.id === "location") val = job.location;
        else if (f.id === "deadlineDate") val = job.deadlineDate;
      }
      return escapeCSV(val || "");
    });

    return [
      escapeCSV(job.company),
      escapeCSV(job.role),
      escapeCSV(job.status),
      escapeCSV(job.appliedDate),
      ...customValues,
      escapeCSV(job.url),
      escapeCSV(job.notes),
    ];
  });

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const downloadUrl = URL.createObjectURL(blob);
  link.href = downloadUrl;
  link.download = `job-applications-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(downloadUrl);
}

function normalizeStatus(raw: string): ApplicationStatus {
  const s = raw.trim().toLowerCase();
  if (s.includes("interview") || s.includes("screen") || s.includes("assessment") || s.includes("oa") || s.includes("round")) return "Interview";
  if (s.includes("offer") || s.includes("accepted")) return "Offer";
  if (s.includes("reject") || s.includes("declined") || s.includes("denied") || s.includes("closed") || s.includes("archive")) return "Rejected";
  if (s.includes("applied") || s.includes("submitted") || s.includes("active") || s.includes("in review")) return "Applied";
  return "Other";
}

function normalizeDate(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return new Date().toISOString().split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
}

export interface CSVParseResult {
  jobs: Record<string, JobApplication>;
  rows: JobApplication[];
  count: number;
  skippedCount: number;
  headers: string[];
  detectedMapping: {
    companyCol: string;
    roleCol: string;
    statusCol: string;
    dateCol: string;
    urlCol: string;
    notesCol: string;
  };
}

export function parseApplicationsFromRows(matrix: string[][]): CSVParseResult {
  if (matrix.length < 2) {
    throw new Error("File is empty or missing data rows.");
  }

  const rawHeaders = matrix[0];
  const cleanHeaders = rawHeaders.map((h) => String(h || "").toLowerCase().replace(/[^a-z0-9]/g, ""));

  const findIndex = (patterns: string[]) =>
    cleanHeaders.findIndex((h) => patterns.some((p) => h === p || h.includes(p)));

  let companyIdx = findIndex(["company", "companyname", "organization", "employer", "firm"]);
  let roleIdx = findIndex(["role", "position", "jobtitle", "title", "job"]);
  let statusIdx = findIndex(["status", "stage", "state", "applicationstatus"]);
  let dateIdx = findIndex(["dateapplied", "applieddate", "applicationdate", "date", "appliedon"]);
  let urlIdx = findIndex(["postingurl", "joburl", "url", "link", "joblink", "listing"]);
  let notesIdx = findIndex(["notes", "note", "comments", "comment", "description", "details"]);
  let salaryIdx = findIndex(["salary", "compensation", "pay", "rate", "hourly", "annual"]);
  let locationIdx = findIndex(["location", "city", "workplace", "remote", "mode"]);
  let deadlineIdx = findIndex(["deadline", "deadlinedate", "due", "duedate", "nextround", "interviewdate"]);

  // If company or role wasn't matched by name, assign to the first unclaimed column
  if (companyIdx === -1) {
    const claimed = new Set([roleIdx, statusIdx, dateIdx, urlIdx, notesIdx, salaryIdx, locationIdx, deadlineIdx].filter((i) => i !== -1));
    for (let i = 0; i < rawHeaders.length; i++) {
      if (!claimed.has(i)) {
        companyIdx = i;
        break;
      }
    }
    if (companyIdx === -1) companyIdx = 0;
  }

  if (roleIdx === -1) {
    const claimed = new Set([companyIdx, statusIdx, dateIdx, urlIdx, notesIdx, salaryIdx, locationIdx, deadlineIdx].filter((i) => i !== -1));
    for (let i = 0; i < rawHeaders.length; i++) {
      if (!claimed.has(i)) {
        roleIdx = i;
        break;
      }
    }
    if (roleIdx === -1) roleIdx = 1;
  }

  const detectedMapping = {
    companyCol:
      companyIdx !== -1 && rawHeaders[companyIdx]?.trim().length > 0
        ? rawHeaders[companyIdx].trim()
        : `Column ${companyIdx + 1}`,
    roleCol:
      roleIdx !== -1 && rawHeaders[roleIdx]?.trim().length > 0
        ? rawHeaders[roleIdx].trim()
        : `Column ${roleIdx + 1}`,
    statusCol:
      statusIdx !== -1 && rawHeaders[statusIdx]?.trim().length > 0
        ? rawHeaders[statusIdx].trim()
        : `Column ${statusIdx + 1}`,
    dateCol:
      dateIdx !== -1 && rawHeaders[dateIdx]?.trim().length > 0
        ? rawHeaders[dateIdx].trim()
        : `Column ${dateIdx + 1}`,
    urlCol:
      urlIdx !== -1 && rawHeaders[urlIdx]?.trim().length > 0
        ? rawHeaders[urlIdx].trim()
        : `Column ${urlIdx + 1}`,
    notesCol:
      notesIdx !== -1 && rawHeaders[notesIdx]?.trim().length > 0
        ? rawHeaders[notesIdx].trim()
        : `Column ${notesIdx + 1}`,
  };

  // Claimed column indices
  const claimed = new Set([companyIdx, roleIdx, statusIdx, dateIdx, urlIdx, notesIdx, salaryIdx, locationIdx, deadlineIdx].filter((i) => i !== -1));
  const extraCols: { idx: number; key: string }[] = [];
  rawHeaders.forEach((h, idx) => {
    if (!claimed.has(idx) && h && String(h).trim().length > 0) {
      const cleanKey = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
      extraCols.push({ idx, key: cleanKey });
    }
  });

  const newJobsMap: Record<string, JobApplication> = {};
  const rows: JobApplication[] = [];
  let count = 0;
  let skippedCount = 0;

  for (let i = 1; i < matrix.length; i++) {
    const cols = matrix[i];
    const company = (companyIdx !== -1 ? cols[companyIdx] : "") || "";
    const role = (roleIdx !== -1 ? cols[roleIdx] : "") || "";

    if (!company && !role) {
      skippedCount++;
      continue;
    }

    const rawStatus = statusIdx !== -1 ? cols[statusIdx] || "" : "";
    const status: ApplicationStatus = rawStatus ? normalizeStatus(rawStatus) : "Applied";
    const appliedDate = dateIdx !== -1 ? normalizeDate(cols[dateIdx] || "") : new Date().toISOString().split("T")[0];
    const url = (urlIdx !== -1 ? cols[urlIdx] : "") || "#";
    const notes = (notesIdx !== -1 ? cols[notesIdx] : "") || "";
    const salary = (salaryIdx !== -1 ? cols[salaryIdx] : "") || "";
    const location = (locationIdx !== -1 ? cols[locationIdx] : "") || "";
    const deadlineDate = (deadlineIdx !== -1 ? cols[deadlineIdx] : "") || "";

    const customFields: Record<string, string> = {};
    if (salary) customFields.salary = salary;
    if (location) customFields.location = location;
    if (deadlineDate) customFields.deadlineDate = deadlineDate;
    for (const ec of extraCols) {
      const val = cols[ec.idx]?.trim();
      if (val) {
        customFields[ec.key] = val;
      }
    }

    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${count}`;
    const job: JobApplication = {
      id,
      company: company || "Unknown Company",
      role: role || "Unknown Role",
      status,
      appliedDate,
      url: url.startsWith("http") || url === "#" ? url : `https://${url}`,
      notes,
      salary: salary || undefined,
      location: location || undefined,
      deadlineDate: deadlineDate || undefined,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    };

    newJobsMap[id] = job;
    rows.push(job);
    count++;
  }

  if (count === 0) {
    throw new Error("No valid job applications were found in the file.");
  }

  return {
    jobs: newJobsMap,
    rows,
    count,
    skippedCount,
    headers: rawHeaders,
    detectedMapping,
  };
}

export function parseApplicationsFromCSV(csvText: string): CSVParseResult {
  const isTSV = csvText.includes("\t") && (!csvText.includes(",") || csvText.indexOf("\t") < csvText.indexOf(","));
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("File is empty or missing data rows.");
  }
  const matrix = lines.map((line) =>
    isTSV ? line.split("\t").map((c) => c.trim()) : parseCSVLine(line)
  );
  return parseApplicationsFromRows(matrix);
}

export async function parseApplicationsFromExcel(file: File): Promise<CSVParseResult> {
  const { readSheet } = await import("read-excel-file/browser");
  const rawRows = await readSheet(file);
  const matrix: string[][] = (rawRows as unknown[][]).map((row) =>
    (row as unknown[]).map((cell) => {
      if (cell === null || cell === undefined) return "";
      if (cell instanceof Date) return cell.toISOString().split("T")[0];
      return String(cell).trim();
    })
  );
  return parseApplicationsFromRows(matrix);
}
