import assert from "node:assert/strict";
import {
  extractJobIdFromUrl,
  getEffectiveJobId,
  isDuplicateJob,
  findDuplicateJob,
  formatDuplicateMessage,
} from "../src/lib/jobId.ts";

// 1. URL extraction tests
assert.equal(
  extractJobIdFromUrl("https://toyota.wd5.myworkdayjobs.com/Toyota/job/Plano-TX/Software-Engineer_JR26081665"),
  "JR26081665"
);
assert.equal(
  extractJobIdFromUrl("https://company.myworkdayjobs.com/job/R-102938"),
  "R-102938"
);
assert.equal(
  extractJobIdFromUrl("https://boards.greenhouse.io/stripe/jobs/5432198"),
  "5432198"
);
assert.equal(
  extractJobIdFromUrl("https://www.linkedin.com/jobs/view/3920192847/"),
  "3920192847"
);
assert.equal(
  extractJobIdFromUrl("https://www.indeed.com/viewjob?jk=7a8b9c0d1e2f3a4b"),
  "7a8b9c0d1e2f3a4b"
);

// 2. Effective Job ID tests
assert.equal(
  getEffectiveJobId({ url: "https://toyota.wd5.myworkdayjobs.com/Toyota/job/Plano-TX/Software-Engineer_JR26081665" }),
  "JR26081665"
);
assert.equal(
  getEffectiveJobId({ jobId: "JR26081665", url: "https://example.com" }),
  "JR26081665"
);

// 3. Duplicate detection tests
const existingApp = {
  id: "job-1",
  company: "Toyota Motor North America",
  role: "Software Engineer",
  appliedDate: "2026-10-14",
  status: "Applied",
  url: "https://toyota.wd5.myworkdayjobs.com/Toyota/job/Plano-TX/Software-Engineer_JR26081665",
  notes: "",
};

// Should match on extracted JR26081665
assert.equal(
  isDuplicateJob({ company: "Toyota", jobId: "JR26081665" }, existingApp),
  true
);

// Should match on identical URL
assert.equal(
  isDuplicateJob({ url: "https://toyota.wd5.myworkdayjobs.com/Toyota/job/Plano-TX/Software-Engineer_JR26081665" }, existingApp),
  true
);

// Pure digits without matching company should not collide
const numericApp = {
  id: "job-2",
  company: "Google",
  role: "SWE",
  appliedDate: "2026-10-10",
  status: "Applied",
  jobId: "12345",
  url: "#",
  notes: "",
};
assert.equal(
  isDuplicateJob({ company: "Meta", jobId: "12345" }, numericApp),
  false
);
assert.equal(
  isDuplicateJob({ company: "Google LLC", jobId: "12345" }, numericApp),
  true
);

// 4. Duplicate message formatting
const msg = formatDuplicateMessage(existingApp, "JR26081665");
assert.equal(msg.includes("JR26081665"), true);
assert.equal(msg.includes("Applied: Oct 14, 2026"), true);

console.log("All jobId self-checks passed successfully!");
