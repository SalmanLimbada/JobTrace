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
assert.equal(
  extractJobIdFromUrl("https://careers.peelpolice.ca/psc/HR92RECP/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?JobOpeningId=10283"),
  "10283"
);
assert.equal(
  extractJobIdFromUrl("https://www.fitzii.com/apply/100927?s=li"),
  "100927"
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
  isDuplicateJob({ company: "Toyota", jobId: "JR26081665", appliedDate: "2026-10-15" }, existingApp),
  true
);

// Should match on identical URL within 90 days
assert.equal(
  isDuplicateJob({ url: "https://toyota.wd5.myworkdayjobs.com/Toyota/job/Plano-TX/Software-Engineer_JR26081665", appliedDate: "2026-10-15" }, existingApp),
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
  isDuplicateJob({ company: "Meta", jobId: "12345", appliedDate: "2026-10-12" }, numericApp),
  false
);
assert.equal(
  isDuplicateJob({ company: "Google LLC", jobId: "12345", appliedDate: "2026-10-12" }, numericApp),
  true
);

// Scenario 1: Same company and portal base URL, but DIFFERENT roles should NOT collide (Peel Police case)
const peelAppJan = {
  id: "peel-1",
  company: "Peel Regional Police",
  role: "Co-op Student - Network Infrastructure Specialist",
  appliedDate: "2026-01-21",
  status: "Rejected",
  url: "https://careers.peelpolice.ca/psc/HR92RECP/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?JobOpeningId=101",
};
assert.equal(
  isDuplicateJob(
    {
      company: "Peel Regional Police",
      role: "Co-op Student - IT Cyber Security",
      appliedDate: "2026-10-08",
      url: "https://careers.peelpolice.ca/psc/HR92RECP/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?JobOpeningId=102",
    },
    peelAppJan
  ),
  false
);

// Scenario 2: Same role and company, but applied > 90 days ago should NOT be flagged as duplicate
assert.equal(
  isDuplicateJob(
    {
      company: "Manulife",
      role: "Summer Intern 2027 - AI",
      appliedDate: "2026-10-20",
    },
    {
      id: "manulife-old",
      company: "Manulife",
      role: "Summer Intern 2027 - AI",
      appliedDate: "2026-01-10",
      status: "Rejected",
    }
  ),
  false
);

// Scenario 3: Same role and company applied within 90 days SHOULD be flagged as duplicate (Manulife case)
assert.equal(
  isDuplicateJob(
    {
      company: "Manulife",
      role: "Summer Intern 2027 - AI",
      appliedDate: "2026-10-20",
      url: "https://manulife.wd3.myworkdayjobs.com/MFCJH_adminJobs/job/Toronto/Summer-Intern-2027---AI",
    },
    {
      id: "manulife-recent",
      company: "Manulife",
      role: "Summer Intern 2027 - AI",
      appliedDate: "2026-10-08",
      status: "Applied",
      url: "https://manulife.wd3.myworkdayjobs.com/MFCJH_adminJobs/job/Toronto/Summer-Intern-2027---AI",
    }
  ),
  true
);

// Scenario 4: Same company and same role within same cycle, but with DIFFERENT explicit Job IDs should NOT be duplicate
assert.equal(
  isDuplicateJob(
    {
      company: "Google",
      role: "Software Engineer",
      jobId: "REQ-002",
      appliedDate: "2026-10-20",
    },
    {
      id: "google-1",
      company: "Google",
      role: "Software Engineer",
      jobId: "REQ-001",
      appliedDate: "2026-10-18",
      status: "Applied",
    }
  ),
  false
);

// Scenario 5: Same company and same role within same cycle, where one has no Job ID, should still be flagged as duplicate
assert.equal(
  isDuplicateJob(
    {
      company: "Google",
      role: "Software Engineer",
      appliedDate: "2026-10-20",
    },
    {
      id: "google-1",
      company: "Google",
      role: "Software Engineer",
      jobId: "REQ-001",
      appliedDate: "2026-10-18",
      status: "Applied",
    }
  ),
  true
);

// 4. Duplicate message formatting
const msg = formatDuplicateMessage(existingApp, "JR26081665");
assert.equal(msg.includes("JR26081665"), true);
assert.equal(msg.includes("Applied: Oct 14, 2026"), true);

console.log("All jobId self-checks passed successfully!");
