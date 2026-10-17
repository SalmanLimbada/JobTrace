import assert from "node:assert/strict";

function sortJobs(jobs, sortColumn = "appliedDate", sortDirection = "desc") {
  const indexMap = new Map();
  jobs.forEach((j, i) => indexMap.set(j.id, i));

  return [...jobs].sort((a, b) => {
    let valA = a[sortColumn] || "";
    let valB = b[sortColumn] || "";

    const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: "base" });
    if (cmp !== 0) {
      return sortDirection === "asc" ? cmp : -cmp;
    }

    if (sortColumn !== "appliedDate") {
      const dateA = a.appliedDate || "";
      const dateB = b.appliedDate || "";
      const dateCmp = dateA.localeCompare(dateB, undefined, { numeric: true, sensitivity: "base" });
      if (dateCmp !== 0) {
        return sortDirection === "asc" ? dateCmp : -dateCmp;
      }
    }

    if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
      const timeCmp = a.createdAt.localeCompare(b.createdAt);
      return sortDirection === "asc" ? timeCmp : -timeCmp;
    }

    const idxA = indexMap.get(a.id) ?? 0;
    const idxB = indexMap.get(b.id) ?? 0;
    return sortDirection === "asc" ? idxA - idxB : idxB - idxA;
  });
}

// Test case 1: Intra-day with createdAt timestamps
const sampleWithTimestamps = [
  { id: "1", company: "KPMG", appliedDate: "2026-10-17", createdAt: "2026-10-17T09:00:00Z" },
  { id: "2", company: "Parkland", appliedDate: "2026-10-17", createdAt: "2026-10-17T10:15:00Z" },
  { id: "3", company: "Altera", appliedDate: "2026-10-17", createdAt: "2026-10-17T11:30:00Z" },
  { id: "4", company: "Kepler", appliedDate: "2026-10-17", createdAt: "2026-10-17T12:45:00Z" },
  { id: "5", company: "Waabi", appliedDate: "2026-10-17", createdAt: "2026-10-17T14:00:00Z" },
  { id: "6", company: "BC Pension", appliedDate: "2026-10-17", createdAt: "2026-10-17T15:15:00Z" },
  { id: "7", company: "Databricks", appliedDate: "2026-10-17", createdAt: "2026-10-17T16:30:00Z" },
  { id: "8", company: "TechInsights", appliedDate: "2026-10-15", createdAt: "2026-10-15T09:00:00Z" }
];

const descResult = sortJobs(sampleWithTimestamps, "appliedDate", "desc");
assert.equal(descResult[0].company, "Databricks", "Latest job of the day (Databricks) should be #1 on desc");
assert.equal(descResult[6].company, "KPMG", "First job of the day (KPMG) should be #7 on desc");
assert.equal(descResult[7].company, "TechInsights", "Older date (2026-10-15) should be after 2026-10-17 on desc");

// Test case 2: Intra-day without createdAt timestamps (fallback to array order)
const sampleWithoutTimestamps = [
  { id: "1", company: "KPMG", appliedDate: "2026-10-17" },
  { id: "2", company: "Parkland", appliedDate: "2026-10-17" },
  { id: "3", company: "Databricks", appliedDate: "2026-10-17" },
  { id: "4", company: "TechInsights", appliedDate: "2026-10-15" }
];

const fallbackDescResult = sortJobs(sampleWithoutTimestamps, "appliedDate", "desc");
assert.equal(fallbackDescResult[0].company, "Databricks", "Fallback should place latest added (Databricks) first on desc");
assert.equal(fallbackDescResult[2].company, "KPMG", "Fallback should place earliest added (KPMG) last on desc");

// Test case 3: Ascending order
const ascResult = sortJobs(sampleWithTimestamps, "appliedDate", "asc");
assert.equal(ascResult[0].company, "TechInsights", "Earliest date (2026-10-15) should be first on asc");
assert.equal(ascResult[1].company, "KPMG", "Earliest added on 2026-10-17 (KPMG) should be before Databricks on asc");
assert.equal(ascResult[7].company, "Databricks", "Latest added on 2026-10-17 (Databricks) should be last on asc");

console.log("All sort check tests passed successfully!");
