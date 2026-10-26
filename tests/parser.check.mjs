import assert from "node:assert/strict";

function cleanRoleTitle(title) {
  if (!title || typeof title !== "string") return "";
  let t = title.trim();
  t = t.replace(/^[\s•–—\-:|]+|[\s•–—\-:|]+$/g, "").trim();
  t = t.replace(/\bCo\s*-\s*op\b/gi, "Co-op");

  // Strip leading noise
  t = t.replace(/^(?:job\s+application\s+for|opening\s+for|hiring\s+for|position:?|role:?)\s+/i, "");

  // Strip trailing requisition or job IDs (e.g. "(JR-102948)", "- Req ID 84920", "#12345")
  t = t.replace(/\s*[\(\[\-–—|•]?\s*(?:req(?:uisition)?(?:\s*id)?|job\s*id|jr)[\s#:]*[\w-]+[\)\]]?$/i, "");

  // Strip trailing ATS site tags
  t = t.replace(/\s*(?:\||\/\/|—|–|-)\s*(?:careers?(?:\s+at\s+[\w\s&]+)?|jobs?|apply(?:\s+now)?|workday|greenhouse|lever|ashby|smartrecruiters|indeed|linkedin)$/i, "");

  t = t.replace(/^[\s•–—\-:|]+|[\s•–—\-:|]+$/g, "").trim();
  return t;
}

function hasBalancedParens(str) {
  if (!str) return true;
  let round = 0;
  let square = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(') round++;
    else if (ch === ')') {
      round--;
      if (round < 0) return false;
    } else if (ch === '[') square++;
    else if (ch === ']') {
      square--;
      if (square < 0) return false;
    }
  }
  return round === 0 && square === 0;
}

const JUNK_ROLE_REGEX = /^(thank you|thanks|application (?:submitted|received|status|confirmation)|job application|job opening|apply|apply now|applied|congratulations|success|candidate (?:home|portal|profile)|careers?|home|sign in|login|welcome|dashboard|confirm(?:ation)?|search(?:\s+for)?\s+jobs?|browse\s+jobs?|job description|job details)$/i;

function isValidRole(title) {
  if (!title || typeof title !== "string") return false;
  const t = cleanRoleTitle(title);
  if (t.length < 2 || t.length > 120) return false;
  if (!hasBalancedParens(t)) return false;
  if (JUNK_ROLE_REGEX.test(t)) return false;
  if (/^(search(?:\s+for)?\s+jobs?|sign\s+in|log\s+in|candidate\s+home)$/i.test(t)) return false;
  return true;
}

const JUNK_COMPANY_EXACT = /^(careers?|jobs?|apply|apply now|job search|search|search for jobs|browse jobs|find jobs|view jobs|all jobs|current openings|open positions|welcome|candidate home|candidate portal|portal|dashboard|join us|work with us|job opportunities|opportunities|workday|logo|company logo|myworkdayjobs|home|back|back to search|back to jobs|sign in|log in|login|thank you|confirmation|menu|navigation|main navigation|header|footer|banner|button|submit|overview|introduce yourself|saved jobs|job alerts|fitzii)$/i;

const JUNK_COMPANY_PHRASE = /\b(search(?:\s+for)?\s+jobs?|job\s+search|find\s+(?:a\s+)?jobs?|browse\s+(?:all\s+)?jobs?|current\s+openings|career\s+opportunities|candidate\s+home|candidate\s+portal|sign\s+in|log\s+in|introduce\s+yourself|navigation\s+menu|back\s+to\s+search|view\s+all\s+jobs|explore\s+careers|join\s+our\s+talent|talent\s+community)\b/i;

const PURE_ROLE_OR_WORK_WORDS = /^(co-?op|intern|internship|full-?time|part-?time|contract|temporary|remote|hybrid|on-?site|entry\s+level|new\s+grad|junior|senior|lead|staff|principal|software\s+engineer|developer|product\s+manager|data\s+scientist|designer|analyst|specialist|coordinator|assistant|associate|technician|administrator|manager|director)\b/i;

function isValidCompany(name) {
  if (!name || typeof name !== "string") return false;
  const t = name.trim();
  if (t.length < 2 || t.length > 70) return false;
  if (!hasBalancedParens(t)) return false;
  if (/^[/\\]|[/\\&,]$/.test(t)) return false;
  if (JUNK_COMPANY_EXACT.test(t)) return false;
  if (JUNK_COMPANY_PHRASE.test(t)) return false;
  if (PURE_ROLE_OR_WORK_WORDS.test(t)) return false;
  if (/^(search|browse|find|apply|sign\s+in|log\s+in|back\s+to|op\s*\/)\b/i.test(t)) return false;
  return true;
}

function splitByCharRespectingParens(str, targetChar) {
  const parts = [];
  let cur = '';
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (depth === 0 && ch === targetChar) {
      if (cur.trim()) parts.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function splitByDashesRespectingParens(str) {
  const parts = [];
  let cur = '';
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (depth === 0 && (ch === '-' || ch === '–' || ch === '—') && i > 0 && i < str.length - 1 && /\s/.test(str[i-1]) && /\s/.test(str[i+1])) {
      cur = cur.trimEnd();
      if (cur) parts.push(cur);
      cur = '';
      while (i + 1 < str.length && /\s/.test(str[i+1])) i++;
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function splitOnTopDelimiter(str) {
  for (const delim of ['|', '•', '·']) {
    if (str.includes(delim)) {
      const parts = splitByCharRespectingParens(str, delim);
      if (parts.length >= 2) return parts;
    }
  }
  const atMatch = str.match(/^(.+?)\s+(?:at|@)\s+([A-Za-z0-9&.,'’\s-]+)$/i);
  if (atMatch) return [atMatch[1], atMatch[2]];

  return splitByDashesRespectingParens(str);
}

function parseTitleForRoleAndCompany(title) {
  if (!title) return { role: "", company: "" };
  let t = title.trim();
  t = t.replace(/\s*[-–—|•·]\s*(?:LinkedIn|Indeed|Glassdoor|Greenhouse|Lever|Ashby|Workday|SmartRecruiters|Fitzii|BambooHR|Workable|ZipRecruiter|Jobs|Careers).*$/i, "");

  const atMatch = t.match(/^(.+?)\s+(?:at|@)\s+([A-Za-z0-9&.,'’\s-]+)$/i);
  if (atMatch) {
    const rCand = cleanRoleTitle(atMatch[1]);
    const cCand = atMatch[2].trim();
    if (isValidRole(rCand) && isValidCompany(cCand)) return { role: rCand, company: cCand };
  }

  const parts = splitOnTopDelimiter(t);
  if (parts.length <= 1) {
    const single = cleanRoleTitle(parts[0] || t);
    return { role: isValidRole(single) ? single : "", company: "" };
  }

  const ROLE_KW = /\b(engineer|developer|intern|internship|co-?op|student|architect|designer|manager|director|analyst|specialist|scientist|lead|consultant|technician|administrator|officer|assistant|coordinator|associate|fellow|apprentice|vp|head\s+of|representative|recruiter|accountant|executive)\b/i;
  const validParts = parts.filter(p => p.length >= 2 && hasBalancedParens(p));

  let roleCandidate = "";
  let compCandidate = "";

  for (const part of validParts) {
    if (!roleCandidate && isValidRole(part) && ROLE_KW.test(part)) {
      roleCandidate = cleanRoleTitle(part);
      break;
    }
  }

  for (const part of validParts) {
    if (part === roleCandidate) continue;
    if (!compCandidate && isValidCompany(part) && !ROLE_KW.test(part)) {
      compCandidate = part;
      break;
    }
  }

  if (!roleCandidate && validParts.length >= 1 && isValidRole(validParts[0])) {
    roleCandidate = cleanRoleTitle(validParts[0]);
  }
  if (!compCandidate) {
    for (let i = validParts.length - 1; i >= 0; i--) {
      const part = validParts[i];
      if (part !== roleCandidate && isValidCompany(part)) {
        compCandidate = part;
        break;
      }
    }
  }

  return { role: roleCandidate, company: compCandidate };
}

// 1. Unbalanced / truncated pieces must be rejected
assert.equal(isValidCompany("op / Intern)"), false, "op / Intern) must NOT be a valid company");
assert.equal(isValidRole("AI Engineer (Co"), false, "AI Engineer (Co must NOT be a valid role");
assert.equal(isValidRole("JOB APPLICATION"), false, "JOB APPLICATION header must NOT be a valid role");

// 2. Fitzii title tests
const res1 = parseTitleForRoleAndCompany("AI Engineer (Co-op / Intern)  | Themis Intelligence");
assert.equal(res1.role, "AI Engineer (Co-op / Intern)");
assert.equal(res1.company, "Themis Intelligence");

const res2 = parseTitleForRoleAndCompany("AI Engineer (Co - op / Intern)  | Themis Intelligence");
assert.equal(res2.role, "AI Engineer (Co-op / Intern)");
assert.equal(res2.company, "Themis Intelligence");

// 3. Various company/role title combinations
const res3 = parseTitleForRoleAndCompany("Stripe - Backend Software Engineer (New Grad 2026)");
assert.equal(res3.role, "Backend Software Engineer (New Grad 2026)");
assert.equal(res3.company, "Stripe");

const res4 = parseTitleForRoleAndCompany("Front-End Developer at Shopify");
assert.equal(res4.role, "Front-End Developer");
assert.equal(res4.company, "Shopify");

const res5 = parseTitleForRoleAndCompany("Summer Intern 2027 - AI | Manulife");
assert.equal(res5.role, "Summer Intern 2027 - AI");
assert.equal(res5.company, "Manulife");

// 4. Test ATS noise and requisition cleanup
assert.equal(cleanRoleTitle("Senior Backend Engineer (JR-102948)"), "Senior Backend Engineer");
assert.equal(cleanRoleTitle("Software Developer - Req ID 84920"), "Software Developer");
assert.equal(cleanRoleTitle("Job Application for Full Stack Engineer"), "Full Stack Engineer");
assert.equal(cleanRoleTitle("Product Manager | Careers"), "Product Manager");

// 5. Test duplicate detection logic
function cleanStr(s) {
  return (s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
function cleanRole(s) {
  return (s || "").replace(/\s*\([^)]*\)/g, "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
function cleanUrl(u) {
  if (!u || u === "#") return "";
  try {
    const parsed = new URL(u.startsWith("http") ? u : "https://" + u);
    const trackingParams = new Set(["utm_source", "utm_medium", "utm_campaign", "ref", "gh_src"]);
    for (const [k] of parsed.searchParams.entries()) {
      if (trackingParams.has(k.toLowerCase())) parsed.searchParams.delete(k);
    }
    const search = parsed.searchParams.toString();
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "")}${search ? "?" + search : ""}`.toLowerCase();
  } catch {
    return u.trim().toLowerCase();
  }
}
function extractJobId(rawUrl) {
  if (!rawUrl) return null;
  const reqMatch = rawUrl.match(/(?:_|\/|-|\b)(JR\d{4,}|REQ-?\d{4,}|R-?\d{4,})(?:[/?#&_\s]|$)/i);
  if (reqMatch) return reqMatch[1].toUpperCase();
  try {
    const parsed = new URL(rawUrl.startsWith("http") ? rawUrl : "https://" + rawUrl);
    for (const [k, v] of parsed.searchParams.entries()) {
      if (["gh_jid", "jobid", "job_id", "jk"].includes(k.toLowerCase()) && v && v.length >= 3) return v.toUpperCase();
    }
  } catch {}
  const m = rawUrl.match(/\/jobs\/(\d{5,})/i);
  return m ? m[1] : null;
}

function testFindDuplicate(target, list) {
  const tUrl = cleanUrl(target.url);
  const tId = (target.jobId || extractJobId(target.url) || "").trim().toUpperCase();
  const tComp = cleanStr(target.company);
  const tRole = cleanRole(target.role);

  for (const existing of list) {
    const eUrl = cleanUrl(existing.url);
    const eId = (existing.custom_fields?.jobId || extractJobId(existing.url) || "").trim().toUpperCase();
    const eComp = cleanStr(existing.company);
    const eRole = cleanRole(existing.role);

    // Exact URL match
    if (tUrl && eUrl && tUrl === eUrl) return { job: existing, matchType: "exact" };

    // Job ID match
    if (tId && eId) {
      if (tId === eId) return { job: existing, matchType: "exact" };
      // Distinct Job IDs -> similar if same role & company
      if (tComp && eComp && tComp === eComp && tRole && eRole && tRole === eRole) {
        return { job: existing, matchType: "similar" };
      }
      continue;
    }

    // Role & Company match
    if (tComp && eComp && tComp === eComp && tRole && eRole && tRole === eRole) {
      return { job: existing, matchType: "similar" };
    }
  }
  return null;
}

const savedJobs = [
  { company: "Stripe", role: "Software Engineer", url: "https://stripe.com/jobs/12345", custom_fields: { jobId: "JR-1001" }, applied_date: "2026-10-10" },
  { company: "Shopify", role: "Frontend Developer", url: "https://shopify.com/careers/view?gh_jid=998877", applied_date: "2026-09-01" }
];

// Test 5A: Exact URL match with tracking param stripped
const d1 = testFindDuplicate({ url: "https://stripe.com/jobs/12345?utm_source=linkedin", company: "Stripe", role: "Software Engineer" }, savedJobs);
assert.equal(d1?.matchType, "exact", "Should be exact match on cleaned URL");

// Test 5B: Exact Job ID match
const d2 = testFindDuplicate({ url: "https://boards.greenhouse.io/other-link?gh_jid=998877", company: "Shopify", role: "Frontend Developer" }, savedJobs);
assert.equal(d2?.matchType, "exact", "Should be exact match on job ID 998877");

// Test 5C: Same company & role, but distinct Job ID -> Similar, NOT exact
const d3 = testFindDuplicate({ jobId: "JR-2002", company: "Stripe", role: "Software Engineer", url: "https://stripe.com/jobs/99999" }, savedJobs);
assert.equal(d3?.matchType, "similar", "Should be similar match for distinct req ID");

// Test 5D: Completely different role & company -> No match
const d4 = testFindDuplicate({ company: "Google", role: "Data Scientist", url: "https://google.com/jobs/555" }, savedJobs);
assert.equal(d4, null, "Should return null for unrelated job");

console.log("All parser check tests passed successfully!");
