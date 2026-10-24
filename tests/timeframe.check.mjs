import assert from "node:assert/strict";

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTimeframeBounds(timeframe, referenceDate = new Date()) {
  if (timeframe.preset === "all") return null;

  if (timeframe.preset === "7d") {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - 7);
    return { start: getLocalDateString(d), label: "Past 7 Days" };
  }

  if (timeframe.preset === "30d") {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - 30);
    return { start: getLocalDateString(d), label: "Past 30 Days" };
  }

  if (timeframe.preset === "90d") {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - 90);
    return { start: getLocalDateString(d), label: "Past 90 Days" };
  }

  if (timeframe.preset === "year") {
    return { start: `${referenceDate.getFullYear()}-01-01`, label: `Year ${referenceDate.getFullYear()}` };
  }

  if (timeframe.preset === "custom") {
    return {
      start: timeframe.startDate || undefined,
      end: timeframe.endDate || undefined,
      label: "Custom Range",
    };
  }

  return null;
}

function isJobInTimeframe(appliedDate, timeframe, referenceDate = new Date()) {
  if (timeframe.preset === "all") return true;
  const jobDate = (appliedDate || "").split("T")[0].trim();
  if (!jobDate) return false;

  const bounds = getTimeframeBounds(timeframe, referenceDate);
  if (!bounds) return true;

  if (bounds.start && jobDate < bounds.start) return false;
  if (bounds.end && jobDate > bounds.end) return false;
  return true;
}

// Fixed reference date: Oct 23, 2026
const refDate = new Date(2026, 9, 23); // month is 0-indexed: 9 = October

const sampleJobs = [
  { id: "1", appliedDate: "2026-10-23", status: "Applied" },     // today
  { id: "2", appliedDate: "2026-10-20", status: "Interview" },   // 3 days ago (within 7d)
  { id: "3", appliedDate: "2026-10-01", status: "Offer" },       // 22 days ago (within 30d, not 7d)
  { id: "4", appliedDate: "2026-08-15", status: "Rejected" },    // ~69 days ago (within 90d, not 30d)
  { id: "5", appliedDate: "2026-02-10", status: "Applied" },     // this year, but > 90d ago
  { id: "6", appliedDate: "2025-11-05", status: "Interview" },   // last year
  { id: "7", appliedDate: "", status: "Other" },                 // no date
];

// 1. All time: returns all 7
assert.equal(sampleJobs.filter(j => isJobInTimeframe(j.appliedDate, { preset: "all" }, refDate)).length, 7);

// 2. 7 days: jobs 1 and 2
const jobs7d = sampleJobs.filter(j => isJobInTimeframe(j.appliedDate, { preset: "7d" }, refDate));
assert.deepEqual(jobs7d.map(j => j.id), ["1", "2"]);

// 3. 30 days: jobs 1, 2, 3
const jobs30d = sampleJobs.filter(j => isJobInTimeframe(j.appliedDate, { preset: "30d" }, refDate));
assert.deepEqual(jobs30d.map(j => j.id), ["1", "2", "3"]);

// 4. 90 days: jobs 1, 2, 3, 4
const jobs90d = sampleJobs.filter(j => isJobInTimeframe(j.appliedDate, { preset: "90d" }, refDate));
assert.deepEqual(jobs90d.map(j => j.id), ["1", "2", "3", "4"]);

// 5. This year: jobs 1, 2, 3, 4, 5
const jobsYear = sampleJobs.filter(j => isJobInTimeframe(j.appliedDate, { preset: "year" }, refDate));
assert.deepEqual(jobsYear.map(j => j.id), ["1", "2", "3", "4", "5"]);

// 6. Custom range: 2026-08-01 to 2026-10-05: jobs 3, 4
const customJobs = sampleJobs.filter(j => isJobInTimeframe(j.appliedDate, {
  preset: "custom",
  startDate: "2026-08-01",
  endDate: "2026-10-05"
}, refDate));
assert.deepEqual(customJobs.map(j => j.id), ["3", "4"]);

console.log("All timeframe tests passed successfully!");
