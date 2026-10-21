// Universal Page Scraper & JobTrace Sync

let currentRequirements = [];
let extensionSettings = {
  extractRequirements: true,
  targetFields: ["company", "role", "url", "location", "salary", "notes", "keyRequirements"]
};
let currentUserId = null;

// Extractor function executed in context of the active tab
function scrapePageDetails() {
  try {
    function decodeHTMLEntities(str) {
      if (!str || typeof str !== "string") return "";
      return str
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&ndash;/gi, "–")
        .replace(/&mdash;/gi, "—")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&bull;/gi, "•")
        .replace(/&#8211;/g, "–")
        .replace(/&#8212;/g, "—")
        .replace(/&#8226;/g, "•")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
        .replace(/\u00A0/g, " ")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    function cleanRoleTitle(title) {
      if (!title || typeof title !== "string") return "";
      let t = decodeHTMLEntities(title);
      t = t.replace(/^[\s•–—\-:|]+|[\s•–—\-:|]+$/g, "").trim();
      t = t.replace(/\bCo\s*-\s*op\b/gi, "Co-op");
      return t;
    }

    function hasBalancedParens(str) {
      if (!str || typeof str !== "string") return true;
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

    const JUNK_COMPANY_EXACT = /^(careers?|jobs?|apply|apply now|job search|search|search for jobs|browse jobs|find jobs|view jobs|all jobs|current openings|open positions|welcome|candidate home|candidate portal|portal|dashboard|join us|work with us|job opportunities|opportunities|workday|logo|company logo|myworkdayjobs|home|back|back to search|back to jobs|sign in|log in|login|thank you|confirmation|menu|navigation|main navigation|header|footer|banner|button|submit|overview|introduce yourself|saved jobs|job alerts|fitzii)$/i;

    const JUNK_COMPANY_PHRASE = /\b(search(?:\s+for)?\s+jobs?|job\s+search|find\s+(?:a\s+)?jobs?|browse\s+(?:all\s+)?jobs?|current\s+openings|career\s+opportunities|candidate\s+home|candidate\s+portal|sign\s+in|log\s+in|introduce\s+yourself|navigation\s+menu|back\s+to\s+search|view\s+all\s+jobs|explore\s+careers|join\s+our\s+talent|talent\s+community)\b/i;

    const PURE_ROLE_OR_WORK_WORDS = /^(co-?op|intern|internship|full-?time|part-?time|contract|temporary|remote|hybrid|on-?site|entry\s+level|new\s+grad|junior|senior|lead|staff|principal|software\s+engineer|developer|product\s+manager|data\s+scientist|designer|analyst|specialist|coordinator|assistant|associate|technician|administrator|manager|director)\b/i;

    function isValidCompany(name) {
      if (!name || typeof name !== "string") return false;
      const t = decodeHTMLEntities(name).trim();
      if (t.length < 2 || t.length > 70) return false;
      if (!hasBalancedParens(t)) return false;
      if (/^[/\\]|[/\\&,]$/.test(t)) return false;
      if (JUNK_COMPANY_EXACT.test(t)) return false;
      if (JUNK_COMPANY_PHRASE.test(t)) return false;
      if (PURE_ROLE_OR_WORK_WORDS.test(t)) return false;
      if (/^(search|browse|find|apply|sign\s+in|log\s+in|back\s+to|op\s*\/)\b/i.test(t)) return false;
      return true;
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
      let t = decodeHTMLEntities(title).trim();
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

    let initialUrl = window.location.href;
    // If on a post-application submission or confirmation page, check if document.referrer points to the actual job posting
    try {
      if (document.referrer && (document.referrer.startsWith("http://") || document.referrer.startsWith("https://"))) {
        const curPath = window.location.pathname.toLowerCase();
        const isConfirm = /submitted|confirmation|thank|thanks|applied|complete|success/i.test(curPath) ||
          /thank you for applying|application (?:has been )?submitted/i.test(document.title);
        if (isConfirm && !/submitted|confirmation|thank|thanks|applied|complete/i.test(document.referrer)) {
          initialUrl = document.referrer;
        }
      }
    } catch (e) {}

    const result = {
      company: "",
      role: "",
      url: initialUrl,
      location: "",
      salary: "",
      jobId: "",
      notes: "",
      keyRequirements: []
    };

    function isJobPostingType(t) {
      if (!t) return false;
      if (Array.isArray(t)) return t.some(isJobPostingType);
      return String(t).toLowerCase().includes("jobposting");
    }

    // 1. Schema.org JSON-LD
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const s of scripts) {
        try {
          let json = JSON.parse(s.textContent || "{}");
          if (Array.isArray(json)) json = json.find(j => j && isJobPostingType(j["@type"])) || json[0];
          if (json && json["@graph"]) json = json["@graph"].find(j => j && isJobPostingType(j["@type"])) || json;

          if (json && (isJobPostingType(json["@type"]) || json.title || json.hiringOrganization)) {
            if (json.title && !result.role) {
              const cleanTitle = cleanRoleTitle(json.title);
              if (isValidRole(cleanTitle)) result.role = cleanTitle;
            }
            if (json.identifier) {
              const idVal = typeof json.identifier === "string" ? json.identifier : (json.identifier.value || json.identifier.name);
              if (idVal && !result.jobId) result.jobId = decodeHTMLEntities(String(idVal));
            }
            if (!result.jobId && json.jobPostingId) result.jobId = decodeHTMLEntities(String(json.jobPostingId));
            if (json.hiringOrganization) {
              const org = typeof json.hiringOrganization === "string" ? json.hiringOrganization : json.hiringOrganization.name;
              if (org) {
                const cleanOrg = decodeHTMLEntities(org);
                if (isValidCompany(cleanOrg) && !result.company) result.company = cleanOrg;
              }
            }
            if (json.jobLocation) {
              let loc = "";
              const addr = json.jobLocation.address;
              if (typeof addr === "string") loc = addr;
              else if (addr && typeof addr === "object") {
                loc = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(", ");
              }
              if (loc && !result.location) result.location = decodeHTMLEntities(loc);
            }
            if (json.baseSalary) {
              const val = json.baseSalary.value;
              if (typeof val === "object" && (val.minValue || val.value)) {
                const cur = json.baseSalary.currency || "$";
                result.salary = decodeHTMLEntities(`${cur}${val.minValue || val.value}${val.maxValue ? " - " + cur + val.maxValue : ""}`);
              } else if (typeof val === "string" || typeof val === "number") {
                result.salary = decodeHTMLEntities(String(val));
              }
            }
            if (json.description && result.keyRequirements.length === 0) {
              const tmp = document.createElement("div");
              tmp.innerHTML = json.description;
              const lis = tmp.querySelectorAll("li");
              if (lis.length > 0) {
                const bullets = Array.from(lis)
                  .map(li => decodeHTMLEntities(li.textContent))
                  .filter(t => t.length > 15 && t.length < 250);
                if (bullets.length > 0) result.keyRequirements = bullets.slice(0, 8);
              }
            }
          }
        } catch (e) {}
      }
    } catch (e) {}

    // 1.5 OpenGraph & Meta tags
    try {
      if (!result.company) {
        const ogSite = document.querySelector("meta[property='og:site_name'], meta[name='application-name']")?.getAttribute("content");
        if (ogSite && isValidCompany(ogSite)) result.company = decodeHTMLEntities(ogSite);
      }
      const ogTitle = document.querySelector("meta[property='og:title'], meta[name='twitter:title']")?.getAttribute("content");
      if (ogTitle && (!result.role || !result.company)) {
        const parsed = parseTitleForRoleAndCompany(ogTitle);
        if (!result.role && parsed.role && isValidRole(parsed.role)) result.role = parsed.role;
        if (!result.company && parsed.company && isValidCompany(parsed.company)) result.company = parsed.company;
      }
    } catch (e) {}

    // 2. High-accuracy platform selectors
    const host = window.location.hostname.toLowerCase();

    if (host.includes("linkedin.com")) {
      const titleEl = document.querySelector(".job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.topcard__title, .t-24.job-details-jobs-unified-top-card__job-title");
      if (titleEl && !result.role) {
        const r = cleanRoleTitle(titleEl.textContent);
        if (isValidRole(r)) result.role = r;
      }

      const companyEl = document.querySelector(".job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .topcard__org-name-link");
      if (companyEl && !result.company) {
        const c = decodeHTMLEntities(companyEl.textContent);
        if (isValidCompany(c)) result.company = c;
      }

      const locEl = document.querySelector(".job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet, .topcard__flavor--bullet");
      if (locEl && !result.location) result.location = decodeHTMLEntities(locEl.textContent);
    } else if (host.includes("indeed.com")) {
      const titleEl = document.querySelector("h1.jobsearch-JobInfoHeader-title, [data-testid='jobsearch-JobInfoHeader-title']");
      if (titleEl && !result.role) {
        const r = cleanRoleTitle(titleEl.textContent);
        if (isValidRole(r)) result.role = r;
      }

      const companyEl = document.querySelector("[data-testid='inlineHeader-companyName'], .jobsearch-InlineCompanyRating-companyHeader");
      if (companyEl && !result.company) {
        const c = decodeHTMLEntities(companyEl.textContent);
        if (isValidCompany(c)) result.company = c;
      }

      const locEl = document.querySelector("[data-testid='inlineHeader-companyLocation'], #inlineHeader-companyLocation");
      if (locEl && !result.location) result.location = decodeHTMLEntities(locEl.textContent);
    } else if (host.includes("greenhouse.io")) {
      const titleEl = document.querySelector(".app-title, h1.job-title, [data-qa='job-title']");
      if (titleEl && !result.role) {
        const r = cleanRoleTitle(titleEl.textContent);
        if (isValidRole(r)) result.role = r;
      }

      const companyEl = document.querySelector(".company-name, [data-qa='company-name']");
      if (companyEl && !result.company) {
        const c = decodeHTMLEntities(companyEl.textContent);
        if (isValidCompany(c)) result.company = c;
      }

      const locEl = document.querySelector(".location");
      if (locEl && !result.location) result.location = decodeHTMLEntities(locEl.textContent);
    } else if (host.includes("lever.co")) {
      const titleEl = document.querySelector(".posting-headline h2, h2.posting-headline");
      if (titleEl && !result.role) {
        const r = cleanRoleTitle(titleEl.textContent);
        if (isValidRole(r)) result.role = r;
      }

      const companyEl = document.querySelector(".main-header-logo img")?.getAttribute("alt") || document.querySelector(".posting-header .company");
      if (companyEl && !result.company) {
        const cName = typeof companyEl === "string" ? companyEl : companyEl.textContent;
        const clean = decodeHTMLEntities(cName).replace(/ logo/i, "").trim();
        if (isValidCompany(clean)) result.company = clean;
      }

      const locEl = document.querySelector(".posting-categories .location");
      if (locEl && !result.location) result.location = decodeHTMLEntities(locEl.textContent);
    } else if (host.includes("ashbyhq.com")) {
      const titleEl = document.querySelector("h1");
      if (titleEl && !result.role) {
        const r = cleanRoleTitle(titleEl.textContent);
        if (isValidRole(r)) result.role = r;
      }

      const locEl = document.querySelector("[class*='location'], [class*='Location']");
      if (locEl && !result.location) result.location = decodeHTMLEntities(locEl.textContent);
    } else if (host.includes("myworkdayjobs.com") || host.includes("workday")) {
      // Workday specific extraction

      // 1. Role extraction
      const wdTitleEl = document.querySelector(
        '[data-automation-id="jobPostingHeader"], [data-automation-id="jobPostingTitle"], [data-automation-id="jobTitle"], h1[data-automation-id="jobPostingHeader"], h2[data-automation-id="jobPostingTitle"], h1'
      );
      if (wdTitleEl && !result.role) {
        const r = cleanRoleTitle(wdTitleEl.textContent);
        if (isValidRole(r)) result.role = r;
      }

      // 2. OpenGraph site_name or meta tags
      const metaSite = document.querySelector("meta[property='og:site_name']")?.getAttribute("content");
      if (metaSite) {
        const cleanSite = decodeHTMLEntities(metaSite);
        if (isValidCompany(cleanSite) && !result.company) result.company = cleanSite;
      }

      // 3. Banner logo alt or title (strictly logo elements, never search/nav buttons)
      if (!result.company) {
        const bannerImg = document.querySelector(
          '[data-automation-id="bannerLogo"] img, [data-automation-id="legalEntityBanner"] img, [data-automation-id="logo"] img, header a[data-automation-id*="logo"] img'
        );
        const alt = bannerImg?.getAttribute("alt") || bannerImg?.getAttribute("title");
        if (alt) {
          const cleanAlt = decodeHTMLEntities(alt).replace(/\s*(?:logo|icon|home|banner)\s*/gi, "").trim();
          if (isValidCompany(cleanAlt)) result.company = cleanAlt;
        }
      }

      // 4. Banner text / legal entity
      if (!result.company) {
        const bannerEl = document.querySelector('[data-automation-id="legalEntityBanner"], [data-automation-id="bannerLogo"] a, [data-automation-id="aboutUsCompany"]');
        if (bannerEl) {
          const txt = decodeHTMLEntities(bannerEl.textContent).replace(/\s*(?:Careers|Jobs|Home)\s*$/i, "").trim();
          if (isValidCompany(txt)) result.company = txt;
        }
      }

      // 5. Subdomain extraction: e.g. "entrust.wd1.myworkdayjobs.com" -> "Entrust"
      if (!result.company) {
        const wdHostMatch = window.location.hostname.match(/^([a-z0-9_-]+?)(?:\.wd\d+)?\.myworkdayjobs\.com/i);
        if (wdHostMatch && wdHostMatch[1]) {
          let slug = wdHostMatch[1].replace(/[-_]/g, " ");
          slug = slug.replace(/\bgroup\b/i, " Group").replace(/\b(careers?|jobs?)\b/gi, "").trim();
          const formatted = slug.replace(/\b[a-z]/g, (c) => c.toUpperCase());
          if (isValidCompany(formatted)) result.company = formatted;
        }
      }

      // 6. Path extraction e.g. /en-US/Perseus-careers1/job/...
      if (!result.company) {
        const pathParts = window.location.pathname.split("/").filter(Boolean);
        for (const part of pathParts) {
          if (/^en-[A-Za-z]{2,4}$/i.test(part) || /^(job|jobs|details)$/i.test(part) || !isValidCompany(part)) continue;
          const candidate = part.replace(/[-_](?:careers|jobs)\d*$/i, "").replace(/[-_]/g, " ").replace(/\d+$/, "").trim();
          const formatted = candidate.replace(/\b[a-z]/g, (c) => c.toUpperCase());
          if (isValidCompany(formatted)) {
            result.company = formatted;
            break;
          }
        }
      }

      // 7. Location
      if (!result.location) {
        const locEl = document.querySelector('[data-automation-id="jobPostingLocation"], [data-automation-id="locations"], dd[data-automation-id="jobPostingLocation"]');
        if (locEl) result.location = decodeHTMLEntities(locEl.textContent);
      }
    } else if (host.includes("smartrecruiters.com")) {
      const titleEl = document.querySelector("h1.job-title, [itemprop='title'], h1");
      if (titleEl && !result.role) {
        const r = cleanRoleTitle(titleEl.textContent);
        if (isValidRole(r)) result.role = r;
      }
      const companyEl = document.querySelector(".company-name, [itemprop='hiringOrganization']");
      if (companyEl && !result.company) {
        const c = decodeHTMLEntities(companyEl.textContent);
        if (isValidCompany(c)) result.company = c;
      }
    } else if (host.includes("bamboohr.com")) {
      const titleEl = document.querySelector("h1, .job-detail-title, [data-qa='job-title']");
      if (titleEl && !result.role) {
        const r = cleanRoleTitle(titleEl.textContent);
        if (isValidRole(r)) result.role = r;
      }
      const m = host.match(/^([a-z0-9_-]+)\.bamboohr\.com/i);
      if (m && !result.company) {
        const c = m[1].replace(/[-_]/g, " ").replace(/\b[a-z]/g, ch => ch.toUpperCase());
        if (isValidCompany(c)) result.company = c;
      }
    } else if (host.includes("fitzii.com")) {
      const allP = Array.from(document.querySelectorAll("p, div, h2, h3, h4, span, label"));
      const applyForEl = allP.find(el => /you\s+(?:are|'re)?\s+applying\s+for/i.test(el.textContent));
      if (applyForEl) {
        let container = applyForEl.nextElementSibling;
        while (container && container.tagName === "BR") container = container.nextElementSibling;
        if (container) {
          const items = Array.from(container.querySelectorAll("p, div, span"))
            .map(el => decodeHTMLEntities(el.textContent).trim())
            .filter(Boolean);
          if (items.length >= 1 && !result.role && isValidRole(items[0])) result.role = cleanRoleTitle(items[0]);
          if (items.length >= 2 && !result.company && isValidCompany(items[1])) result.company = items[1];
          if (items.length >= 3 && !result.location) result.location = items[2];
        }
      }
      const fitziiIdMatch = window.location.pathname.match(/\/apply\/(\d+)/i);
      if (fitziiIdMatch && !result.jobId) result.jobId = fitziiIdMatch[1];
    } else if (host.includes("workable.com")) {
      const titleEl = document.querySelector("h1[data-ui='job-title'], [data-ui='overview-title'], h1");
      if (titleEl && !result.role) {
        const r = cleanRoleTitle(titleEl.textContent);
        if (isValidRole(r)) result.role = r;
      }
      const compEl = document.querySelector("[data-ui='company-name'], .company-name");
      if (compEl && !result.company) {
        const c = decodeHTMLEntities(compEl.textContent);
        if (isValidCompany(c)) result.company = c;
      }
    } else if (host.includes("icims.com")) {
      const titleEl = document.querySelector(".iCIMS_Header h1, .iCIMS_JobTitle, h1");
      if (titleEl && !result.role) {
        const r = cleanRoleTitle(titleEl.textContent);
        if (isValidRole(r)) result.role = r;
      }
      const compEl = document.querySelector(".iCIMS_Company, .company-name");
      if (compEl && !result.company) {
        const c = decodeHTMLEntities(compEl.textContent);
        if (isValidCompany(c)) result.company = c;
      }
    } else if (host.includes("jobvite.com")) {
      const titleEl = document.querySelector(".jv-job-detail-top-title, h2.jv-header, h1");
      if (titleEl && !result.role) {
        const r = cleanRoleTitle(titleEl.textContent);
        if (isValidRole(r)) result.role = r;
      }
      const compEl = document.querySelector(".jv-logo img[alt], .jv-header-company");
      if (compEl && !result.company) {
        const c = decodeHTMLEntities(compEl.getAttribute ? compEl.getAttribute("alt") || compEl.textContent : compEl.textContent);
        if (isValidCompany(c)) result.company = c;
      }
    } else if (host.includes("applytojob.com") || host.includes("jazzhr.com")) {
      const titleEl = document.querySelector("h1.job-title, #header h1, h1");
      if (titleEl && !result.role) {
        const r = cleanRoleTitle(titleEl.textContent);
        if (isValidRole(r)) result.role = r;
      }
      const compEl = document.querySelector(".company-name, a.brand-logo");
      if (compEl && !result.company) {
        const c = decodeHTMLEntities(compEl.textContent);
        if (isValidCompany(c)) result.company = c;
      }
    } else if (host.includes("rippling.com") || host.includes("rippling-ats.com")) {
      const titleEl = document.querySelector("[data-testid='job-title'], h1");
      if (titleEl && !result.role) {
        const r = cleanRoleTitle(titleEl.textContent);
        if (isValidRole(r)) result.role = r;
      }
      const compEl = document.querySelector("[data-testid='company-name'], .company-name");
      if (compEl && !result.company) {
        const c = decodeHTMLEntities(compEl.textContent);
        if (isValidCompany(c)) result.company = c;
      }
    } else if (host.includes("joinhandshake.com")) {
      const titleEl = document.querySelector("[data-hook='job-title'], h1");
      if (titleEl && !result.role) {
        const r = cleanRoleTitle(titleEl.textContent);
        if (isValidRole(r)) result.role = r;
      }
      const compEl = document.querySelector("[data-hook='employer-name'], a[href*='/employers/']");
      if (compEl && !result.company) {
        const c = decodeHTMLEntities(compEl.textContent);
        if (isValidCompany(c)) result.company = c;
      }
    } else if (host.includes("taleo.net") || host.includes("oraclecloud.com")) {
      const titleEl = document.querySelector(".jobtitle, [data-qa='job-title'], h1");
      if (titleEl && !result.role) {
        const r = cleanRoleTitle(titleEl.textContent);
        if (isValidRole(r)) result.role = r;
      }
      const compEl = document.querySelector(".companyname, [data-qa='company-name']");
      if (compEl && !result.company) {
        const c = decodeHTMLEntities(compEl.textContent);
        if (isValidCompany(c)) result.company = c;
      }
    }

    // 2.5 Post-application / confirmation page text parsing
    // E.g. "Thank you for applying to the Software Engineer position at Acme Corp"
    // or "Your application for Senior Frontend Developer has been submitted"
    try {
      const confirmationRoleEl = document.querySelector('[data-automation-id="jobPostingTitle"], [data-automation-id="compositeHeaderSubTitle"], [data-automation-id="jobTitle"], .gwt-Label.job-title, [data-qa="job-title"]');
      if (confirmationRoleEl) {
        const cRole = cleanRoleTitle(confirmationRoleEl.textContent);
        if (isValidRole(cRole) && !result.role) result.role = cRole;
      }

      const pageText = document.body.innerText || "";
      if (!result.role || !result.company) {
        const applyForMatch = pageText.match(/you(?:\s+are|'re)?\s+applying\s+for[:\s]*\n+([^\n]{3,100})\n+([^\n]{2,80})/i);
        if (applyForMatch) {
          const candRole = cleanRoleTitle(applyForMatch[1]);
          const candCompany = decodeHTMLEntities(applyForMatch[2]);
          if (!result.role && isValidRole(candRole)) result.role = candRole;
          if (!result.company && isValidCompany(candCompany)) result.company = candCompany;
        }

        const matchAppliedAt = pageText.match(/(?:applied to|application for)(?:\s+the)?\s+([A-Za-z0-9\s/.,#-]{3,60}?)(?:\s+(?:position|role))?\s+at\s+([A-Za-z0-9\s&.,'-]{2,50})/i);
        if (matchAppliedAt) {
          const parsedRole = cleanRoleTitle(matchAppliedAt[1]);
          const parsedCompany = decodeHTMLEntities(matchAppliedAt[2]);
          if (!result.role && isValidRole(parsedRole)) result.role = parsedRole;
          if (!result.company && isValidCompany(parsedCompany)) result.company = parsedCompany;
        }
      }

      if (!result.role) {
        const matchForRole = pageText.match(/application for(?:\s+the)?\s+([A-Za-z0-9\s/.,#-]{3,60}?)\s+(?:has been|is)/i);
        if (matchForRole) {
          const parsedRole = cleanRoleTitle(matchForRole[1]);
          if (isValidRole(parsedRole)) result.role = parsedRole;
        }
      }
    } catch (e) {}

    // 3. Generic DOM fallbacks
    if (!result.role) {
      const explicitRoleEl = document.querySelector('[data-automation-id="jobTitle"], [data-testid="job-title"], [data-qa="job-title"], h1.job-title, h1.posting-title, .job-title h1, [itemprop="title"]');
      if (explicitRoleEl) {
        const r = cleanRoleTitle(explicitRoleEl.textContent);
        if (isValidRole(r)) result.role = r;
      }
      if (!result.role) {
        const h1 = document.querySelector("h1");
        if (h1) {
          const r = cleanRoleTitle(h1.textContent);
          if (isValidRole(r)) result.role = r;
        }
      }
      if (!result.role) {
        const parsed = parseTitleForRoleAndCompany(document.title);
        if (parsed.role && isValidRole(parsed.role)) result.role = parsed.role;
        if (!result.company && parsed.company && isValidCompany(parsed.company)) result.company = parsed.company;
      }
    }

    // Robust company detection across any page
    // A. OpenGraph site name (authoritative brand name)
    if (!result.company) {
      const metaSite = document.querySelector("meta[property='og:site_name'], meta[name='application-name']")?.getAttribute("content");
      if (metaSite) {
        const clean = decodeHTMLEntities(metaSite);
        if (isValidCompany(clean)) result.company = clean;
      }
    }

    // B. Logo image alt text (specifically on brand/logo elements, NEVER general header icons)
    if (!result.company) {
      const logoImg = document.querySelector(
        'header a[class*="logo"] img[alt], header a[class*="brand"] img[alt], [class*="header"] [class*="logo"] img[alt], [class*="nav"] [class*="logo"] img[alt], a[class*="navbar-brand"] img[alt], [id*="logo"] img[alt]'
      );
      const alt = logoImg?.getAttribute("alt") || logoImg?.getAttribute("title");
      if (alt) {
        const clean = decodeHTMLEntities(alt).replace(/\s*(?:logo|icon|image|home|avatar)\s*/gi, "").trim();
        if (isValidCompany(clean)) result.company = clean;
      }
    }

    // C. Top-left brand / logo link text (specifically brand/logo classes, NOT generic header links)
    if (!result.company) {
      const brandEl = document.querySelector(
        'header a[class*="brand"], header a[class*="logo"], nav a[class*="brand"], nav a[class*="logo"], a[class*="navbar-brand"], [class*="header-logo"]'
      );
      if (brandEl) {
        const txt = decodeHTMLEntities(brandEl.textContent).replace(/\s*(?:Careers|Jobs|Home|Portal)\s*$/i, "").trim();
        if (isValidCompany(txt)) result.company = txt;
      }
    }

    // D. Dedicated company data attributes and selectors
    if (!result.company) {
      const compEl = document.querySelector('[data-company], [class*="company-name"], [class*="companyName"], [class*="employer-name"], [data-automation-id*="company"]');
      if (compEl) {
        const txt = decodeHTMLEntities(compEl.textContent).trim();
        if (isValidCompany(txt)) result.company = txt;
      }
    }

    // E. Title parse fallback
    if (!result.company) {
      const parsed = parseTitleForRoleAndCompany(document.title);
      if (parsed.company && isValidCompany(parsed.company)) {
        result.company = parsed.company;
      }
      if (!result.role && parsed.role && isValidRole(parsed.role)) {
        result.role = parsed.role;
      }
    }

    // F. Text search for "About [Company]" or "[Company] is an Equal Opportunity"
    if (!result.company) {
      const bodyText = document.body.innerText || "";
      const eoeMatch = bodyText.match(/([A-Z][A-Za-z0-9\s&]{2,30}?)\s+is\s+an\s+equal\s+opportunity\s+employer/i);
      if (eoeMatch) {
        const cand = decodeHTMLEntities(eoeMatch[1]);
        if (isValidCompany(cand)) result.company = cand;
      } else {
        const aboutMatch = bodyText.match(/(?:About|Join)\s+([A-Z][A-Za-z0-9\s&]{2,25}?)(?:\s+is\b|\s*,|\s+we\b|\n)/);
        if (aboutMatch) {
          const cand = decodeHTMLEntities(aboutMatch[1]);
          if (isValidCompany(cand)) result.company = cand;
        }
      }
    }

    // Final validation to reject any junk words
    if (!isValidCompany(result.company)) {
      result.company = "";
    }

  if (!result.salary) {
    const salaryMatch = document.body.innerText.match(/(\$|£|€)\s*\d{2,3}(?:,\d{3})*(?:\s*(?:k|K|\/yr|\/year|\/hr|-|\bto\b)\s*(?:\$|£|€)?\s*\d{2,3}(?:,\d{3})*(?:\s*(?:k|K|\/yr|\/year))?)?/);
    if (salaryMatch && salaryMatch[0].length < 35) {
      result.salary = salaryMatch[0].trim();
    }
  }

  // Enhanced High-Signal Key Extraction: Tech Stack, Languages, YoE, Constraints
  try {
    const extractedKeyItems = [];
    const bodyText = document.body.innerText || "";
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, strong, p, b"));

    // 1. Specific sections: Tech Stack, Languages, Technologies
    const techHeader = headings.find(h => {
      const txt = h.textContent.toLowerCase();
      return (
        txt.includes("tech stack") ||
        txt.includes("technologies") ||
        txt.includes("tools & technologies") ||
        txt.includes("programming language") ||
        txt.includes("our stack")
      );
    });

    if (techHeader) {
      let el = techHeader.nextElementSibling;
      while (el && el.tagName !== "UL" && el.tagName !== "OL" && el.tagName !== "P" && !el.querySelector("ul, ol")) {
        el = el.nextElementSibling;
      }
      if (el) {
        const list = el.tagName === "UL" || el.tagName === "OL" ? el : el.querySelector("ul, ol");
        if (list) {
          Array.from(list.querySelectorAll("li")).forEach(li => {
            const t = li.textContent.trim();
            if (t.length > 3 && t.length < 200) extractedKeyItems.push(`[Tech] ${t}`);
          });
        } else if (el.tagName === "P" && el.textContent.trim().length > 10) {
          extractedKeyItems.push(`[Tech] ${el.textContent.trim().slice(0, 150)}`);
        }
      }
    }

    // 2. Years of Experience (YoE) detection
    const yoeRegex = /(?:^|[.\n•-])\s*([^\n.•-]{0,60}?\b(?:\d+[\+]?\s*(?:to\s*\d+\s*)?(?:years?|yrs?)(?:\s+of)?(?:\s+hands-on)?\s+(?:professional\s+)?experience[^\n.•-]{0,100}))/gi;
    let yoeMatch;
    let yoeCount = 0;
    while ((yoeMatch = yoeRegex.exec(bodyText)) !== null && yoeCount < 2) {
      const clean = yoeMatch[1].replace(/^[•\s*-]+/, "").trim();
      if (clean.length > 15 && clean.length < 180 && !extractedKeyItems.some(i => i.includes(clean))) {
        extractedKeyItems.push(`[YoE] ${clean}`);
        yoeCount++;
      }
    }

    // 3. Constraints & Eligibility (Clearance, Citizenship, Sponsorship, Remote/Hybrid)
    const constraintRegex = /(?:^|[.\n•-])\s*([^\n.•-]{0,40}?\b(?:security clearance|secret clearance|top secret|u\.?s\.?\s+citizen(?:ship)?|authorized to work|work authorization|visa sponsorship|no sponsorship|hybrid|on-site|remote within)[^\n.•-]{0,100})/gi;
    let conMatch;
    let conCount = 0;
    while ((conMatch = constraintRegex.exec(bodyText)) !== null && conCount < 2) {
      const clean = conMatch[1].replace(/^[•\s*-]+/, "").trim();
      if (clean.length > 12 && clean.length < 160 && !extractedKeyItems.some(i => i.includes(clean))) {
        extractedKeyItems.push(`[Constraint] ${clean}`);
        conCount++;
      }
    }

    // 4. Requirements & Qualifications bullets fallback/fill
    const reqHeader = headings.find(h => {
      const txt = h.textContent.toLowerCase();
      return (
        txt.includes("requirement") ||
        txt.includes("qualification") ||
        txt.includes("what you'll bring") ||
        txt.includes("what we're looking for") ||
        txt.includes("must have") ||
        txt.includes("skills & experience")
      );
    });

    if (reqHeader) {
      let next = reqHeader.nextElementSibling;
      while (next && next.tagName !== "UL" && next.tagName !== "OL" && !next.querySelector("ul, ol")) {
        next = next.nextElementSibling;
      }
      const list = next ? (next.tagName === "UL" || next.tagName === "OL" ? next : next.querySelector("ul, ol")) : null;
      if (list) {
        const items = Array.from(list.querySelectorAll("li"))
          .map(li => li.textContent.trim())
          .filter(t => t.length > 12 && t.length < 250);

        items.forEach(item => {
          if (extractedKeyItems.length < 8 && !extractedKeyItems.some(i => i.includes(item.slice(0, 30)))) {
            // Categorize if contains tech keywords vs general requirement
            if (/\b(python|javascript|typescript|react|node|java|c\+\+|golang|go|rust|aws|gcp|azure|sql|nosql|docker|kubernetes|graphql|rest|api|linux)\b/i.test(item)) {
              extractedKeyItems.push(`[Tech] ${item}`);
            } else {
              extractedKeyItems.push(item);
            }
          }
        });
      }
    }

    if (extractedKeyItems.length > 0) {
      result.keyRequirements = extractedKeyItems.slice(0, 8);
    }
  } catch (e) {}

    // Extract Job / Requisition ID from DOM or URL
    try {
      if (!result.jobId) {
        const wdIdEl = document.querySelector('[data-automation-id="jobPostingId"], [data-automation-id="requisitionId"], [data-testid="job-req-id"]');
        if (wdIdEl) result.jobId = wdIdEl.textContent.trim();
      }
      if (!result.jobId) {
        const bodyText = document.body?.innerText?.slice(0, 5000) || "";
        const match = bodyText.match(/(?:Job\s*(?:Req(?:uisition)?)?\s*ID|Requisition\s*#?|Job\s*#)[:\s#]+([A-Za-z0-9_-]{4,20})/i);
        if (match) result.jobId = match[1].trim();
      }
      if (!result.jobId) {
        const reqMatch = window.location.href.match(/(?:_|\/|-|\b)(JR\d{4,}|REQ-?\d{4,}|R-?\d{4,})(?:[/?#&_\s]|$)/i);
        if (reqMatch) result.jobId = reqMatch[1].toUpperCase();
      }
    } catch (e) {}

    // Final cleanup: decode HTML entities and trim all fields
    result.company = decodeHTMLEntities(result.company);
    result.role = cleanRoleTitle(result.role);
    result.location = decodeHTMLEntities(result.location);
    result.salary = decodeHTMLEntities(result.salary);
    result.jobId = decodeHTMLEntities(result.jobId);
    if (Array.isArray(result.keyRequirements)) {
      result.keyRequirements = result.keyRequirements.map(decodeHTMLEntities).filter(Boolean);
    }

    if (!isValidCompany(result.company)) {
      result.company = "";
    }
    if (!isValidRole(result.role)) {
      result.role = "";
    }

    // Sanity check: Ensure role and company aren't swapped
    const ROLE_KW_CHECK = /\b(engineer|developer|intern|internship|co-?op|student|architect|designer|manager|director|analyst|specialist|scientist|lead|consultant|technician|administrator|officer|assistant|coordinator|associate|fellow|apprentice)\b/i;
    if (result.company && ROLE_KW_CHECK.test(result.company) && (!result.role || !ROLE_KW_CHECK.test(result.role))) {
      const temp = result.role;
      result.role = result.company;
      result.company = isValidCompany(temp) ? temp : "";
    }

    return result;
  } catch (err) {
    return {
      company: "",
      role: document.title || "",
      url: window.location.href,
      location: "",
      salary: "",
      jobId: "",
      notes: "",
      keyRequirements: []
    };
  }
}

// Render requirement bullets in the popup
function renderRequirements(bullets) {
  currentRequirements = [...bullets];
  const reqsList = document.getElementById("reqsList");
  const reqCount = document.getElementById("reqCount");

  reqCount.textContent = `${currentRequirements.length} bullet${currentRequirements.length === 1 ? "" : "s"}`;

  if (currentRequirements.length === 0) {
    reqsList.innerHTML = `<div class="req-empty">No qualifications detected.</div>`;
    return;
  }

  reqsList.innerHTML = "";
  currentRequirements.forEach((bullet, idx) => {
    const row = document.createElement("div");
    row.className = "req-item";
    row.innerHTML = `
      <span class="req-bullet">•</span>
      <span class="req-text">${bullet.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
      <button type="button" class="req-remove" title="Remove requirement" data-idx="${idx}">×</button>
    `;
    reqsList.appendChild(row);
  });

  // Attach delete handlers
  reqsList.querySelectorAll(".req-remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.currentTarget.getAttribute("data-idx"), 10);
      currentRequirements.splice(idx, 1);
      renderRequirements(currentRequirements);
    });
  });
}

let tableStandardColumns = null;
let tableCustomFields = null;
let extensionCustomFields = [];
let cachedApplications = [];
let isSalaryActive = true;
let isLocationActive = true;
let isUrlActive = true;
let isNotesActive = true;
let currentJobId = "";

function extractJobIdFromUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const url = rawUrl.trim();
  if (url === "#" || url === "" || url.toLowerCase() === "n/a") return null;

  const reqMatch = url.match(/(?:_|\/|-|\b)(JR\d{4,}|REQ-?\d{4,}|R-?\d{4,})(?:[/?#&_\s]|$)/i);
  if (reqMatch) return reqMatch[1].toUpperCase();

  try {
    const parsed = new URL(url.startsWith("http") ? url : "https://" + url);
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
  } catch (e) {}

  const ghMatch = url.match(/\/jobs\/(\d{5,})/i);
  if (ghMatch) return ghMatch[1];

  const leverMatch = url.match(/\/jobs\/([a-f0-9-]{36})/i);
  if (leverMatch) return leverMatch[1];

  const liMatch = url.match(/\/jobs\/view\/(\d{6,})/i);
  if (liMatch) return liMatch[1];

  const applyMatch = url.match(/\/(?:apply|jobs|posting)\/(\d{4,})(?:[/?#]|$)/i);
  if (applyMatch) return applyMatch[1];

  const wdSlugMatch = url.match(/_([A-Za-z0-9]{5,})(?:[/?#]|$)/);
  if (wdSlugMatch) return wdSlugMatch[1];

  return null;
}

function cleanStr(s) {
  return (s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanRole(s) {
  return (s || "")
    .replace(/\s*\([^)]*\)/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function cleanUrl(u) {
  if (!u || u === "#") return "";
  try {
    const parsed = new URL(u.startsWith("http") ? u : "https://" + u);
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
    const keysToDelete = [];
    for (const [key] of parsed.searchParams.entries()) {
      if (trackingParams.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((k) => parsed.searchParams.delete(k));
    const search = parsed.searchParams.toString();
    const hostAndPath = `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "")}`;
    return search ? `${hostAndPath}?${search}` : hostAndPath;
  } catch (e) {
    return u
      .trim()
      .replace(/^https?:\/\/(?:www\.)?/, "")
      .split("?")[0]
      .replace(/\/+$/, "");
  }
}

const MAX_DUPLICATE_DAYS = 90;

function getDaysBetween(dateStr1, dateStr2) {
  if (!dateStr1 || !dateStr2) return null;
  const clean1 = String(dateStr1).split("T")[0];
  const clean2 = String(dateStr2).split("T")[0];
  const d1 = new Date(clean1).getTime();
  const d2 = new Date(clean2).getTime();
  if (isNaN(d1) || isNaN(d2)) return null;
  return Math.abs(Math.round((d1 - d2) / (1000 * 60 * 60 * 24)));
}

function getEffectiveJobId(job) {
  if (!job) return null;
  if (job.jobId && job.jobId.trim()) return job.jobId.trim();
  const cf = job.customFields || job.custom_fields;
  if (cf) {
    if (cf.jobId && cf.jobId.trim()) return cf.jobId.trim();
    if (cf.job_id && cf.job_id.trim()) return cf.job_id.trim();
    if (cf.requisition_id && cf.requisition_id.trim()) return cf.requisition_id.trim();
  }
  return extractJobIdFromUrl(job.url);
}

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "Unknown date";
  const clean = String(dateStr).split("T")[0];
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

const KNOWN_ALIAS_GROUPS = [
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

function cleanCompanyForMatch(name) {
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

function getCompanyInitials(name) {
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

function matchesAliasGroup(name, group) {
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

function areKnownAliases(name1, name2) {
  if (!name1 || !name2) return false;
  for (const group of KNOWN_ALIAS_GROUPS) {
    if (matchesAliasGroup(name1, group) && matchesAliasGroup(name2, group)) {
      return true;
    }
  }
  return false;
}

function findBestMatchingCompany(scrapedCompany, existingApplications = []) {
  if (!scrapedCompany || typeof scrapedCompany !== "string") return "";
  const rawScraped = scrapedCompany.trim();
  if (!rawScraped || !Array.isArray(existingApplications) || existingApplications.length === 0) {
    return rawScraped;
  }

  const companyMap = new Map();
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
  const parensMatch = rawScraped.match(/\(([^)]+)\)/);
  const scrapedParensText = parensMatch ? cleanCompanyForMatch(parensMatch[1]) : "";

  const candidates = [];

  for (const entry of companyMap.values()) {
    const existingRaw = entry.name;
    const existingLower = existingRaw.toLowerCase();
    const existingClean = cleanCompanyForMatch(existingRaw);
    const existingInitials = getCompanyInitials(existingRaw);

    let score = 0;

    if (existingLower === rawScraped.toLowerCase()) {
      score = 1000;
    } else if (existingClean && scrapedClean && existingClean === scrapedClean) {
      score = 800;
    } else if (
      (scrapedInitials && existingClean && scrapedInitials === existingClean) ||
      (existingInitials && scrapedClean && existingInitials === scrapedClean) ||
      (scrapedParensText && existingClean && scrapedParensText === existingClean) ||
      (scrapedParensText && existingInitials && scrapedParensText === existingInitials)
    ) {
      score = 600;
    } else if (areKnownAliases(rawScraped, existingRaw)) {
      score = 500;
    } else if (
      scrapedClean.length >= 3 &&
      existingClean.length >= 3 &&
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

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.count !== a.count) return b.count - a.count;
    return a.latestIndex - b.latestIndex;
  });

  return candidates[0].name;
}

function isDuplicateJob(target, existing) {
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
  const tDate = target.appliedDate || target.applied_date || getLocalDateString();
  const eDate = existing.appliedDate || existing.applied_date;
  if (eDate) {
    const diffDays = getDaysBetween(tDate, eDate);
    if (diffDays !== null && diffDays > MAX_DUPLICATE_DAYS) {
      return false;
    }
  }

  const tComp = cleanStr(target.company);
  const eComp = cleanStr(existing.company);

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

function findDuplicateJob(target, existingList) {
  if (!Array.isArray(existingList)) return null;
  for (const job of existingList) {
    if (isDuplicateJob(target, job)) return job;
  }
  return null;
}

function checkDuplicate() {
  const company = document.getElementById("company")?.value || "";
  const role = document.getElementById("role")?.value || "";
  const url = document.getElementById("url")?.value || "";
  const jobId = currentJobId;

  const duplicateBanner = document.getElementById("duplicateBanner");
  const duplicateBannerText = document.getElementById("duplicateBannerText");
  const saveBtn = document.getElementById("saveBtn");

  if (!duplicateBanner || !duplicateBannerText) return;

  const dup = findDuplicateJob(
    { company, role, url, jobId, appliedDate: getLocalDateString() },
    cachedApplications
  );
  if (dup) {
    const proofDate = formatDateDisplay(dup.appliedDate || dup.applied_date);
    const displayId = getEffectiveJobId(dup);
    if (displayId) {
      duplicateBannerText.textContent = `This was already applied to (ID: ${displayId}) [Applied: ${proofDate}]`;
    } else {
      duplicateBannerText.textContent = `This was already applied to [Applied: ${proofDate}]`;
    }
    duplicateBanner.style.display = "block";
    if (saveBtn) {
      saveBtn.textContent = "Already Applied — Save Anyway";
    }
  } else {
    duplicateBanner.style.display = "none";
    if (saveBtn && !saveBtn.disabled) {
      saveBtn.textContent = "Save to JobTrace";
    }
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderCustomFields() {
  const container = document.getElementById("customFieldsContainer");
  if (!container) return;
  container.innerHTML = "";

  extensionCustomFields.forEach((field) => {
    const row = document.createElement("div");
    row.className = "form-group";
    row.innerHTML = `
      <label for="custom_field_${field.id}">${escapeHtml(field.name)}</label>
      <input type="text" class="custom-field-input" id="custom_field_${field.id}" data-id="${field.id}" data-name="${escapeHtml(field.name)}" placeholder="Enter ${escapeHtml(field.name)}..." />
    `;
    container.appendChild(row);
  });
}

function applyFieldVisibility() {
  const salaryGroup = document.getElementById("salaryGroup");
  const statusSalaryRow = document.getElementById("statusSalaryRow");
  if (salaryGroup) {
    if (!isSalaryActive) {
      salaryGroup.style.display = "none";
      if (statusSalaryRow) statusSalaryRow.style.gridTemplateColumns = "1fr";
    } else {
      salaryGroup.style.display = "";
      if (statusSalaryRow) statusSalaryRow.style.gridTemplateColumns = "1fr 1fr";
    }
  }

  const locationGroup = document.getElementById("locationGroup");
  if (locationGroup) {
    locationGroup.style.display = isLocationActive ? "" : "none";
  }

  const urlGroup = document.getElementById("urlGroup");
  if (urlGroup) {
    urlGroup.style.display = isUrlActive ? "" : "none";
  }

  const reqsSection = document.getElementById("reqsSection");
  if (reqsSection) {
    reqsSection.style.display = extensionSettings.extractRequirements === false ? "none" : "";
  }

  const notesGroup = document.getElementById("notesGroup");
  if (notesGroup) {
    notesGroup.style.display = isNotesActive ? "" : "none";
  }
}

function renderSettingsCheckboxes() {
  const settingSalary = document.getElementById("settingSalary");
  const settingLocation = document.getElementById("settingLocation");
  const settingUrl = document.getElementById("settingUrl");
  const settingReqs = document.getElementById("settingReqs");
  const settingNotes = document.getElementById("settingNotes");

  if (settingSalary) settingSalary.checked = isSalaryActive;
  if (settingLocation) settingLocation.checked = isLocationActive;
  if (settingUrl) settingUrl.checked = isUrlActive;
  if (settingReqs) settingReqs.checked = extensionSettings.extractRequirements !== false;
  if (settingNotes) settingNotes.checked = isNotesActive;
}

function renderSettingsCustomFields() {
  const list = document.getElementById("settingsCustomFieldsList");
  if (!list) return;
  list.innerHTML = "";

  if (extensionCustomFields.length === 0) {
    list.innerHTML = `<div style="font-size: 11px; color: #8b949e; font-style: italic; padding: 4px 0;">No custom fields yet.</div>`;
    return;
  }

  const ul = document.createElement("div");
  ul.style.display = "flex";
  ul.style.flexDirection = "column";
  ul.style.gap = "4px";

  extensionCustomFields.forEach((field) => {
    const item = document.createElement("div");
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.justifyContent = "space-between";
    item.style.background = "#161b22";
    item.style.border = "1px solid #30363d";
    item.style.borderRadius = "4px";
    item.style.padding = "4px 8px";
    item.style.fontSize = "11px";

    item.innerHTML = `
      <span style="color: #c9d1d9; font-weight: 500;">${escapeHtml(field.name)}</span>
      <button type="button" class="del-custom-btn" data-id="${field.id}" style="background: none; border: none; color: #8b949e; font-size: 14px; cursor: pointer; padding: 0 4px; line-height: 1;">×</button>
    `;

    item.querySelector(".del-custom-btn").addEventListener("click", async () => {
      extensionCustomFields = extensionCustomFields.filter(f => f.id !== field.id);
      await chrome.storage.local.set({ extensionCustomFields });
      renderSettingsCustomFields();
      renderCustomFields();
    });

    ul.appendChild(item);
  });

  list.appendChild(ul);
}

function showSettingsView() {
  const jobForm = document.getElementById("jobForm");
  const settingsView = document.getElementById("settingsView");
  if (jobForm && settingsView) {
    jobForm.style.display = "none";
    settingsView.style.display = "block";
    renderSettingsCheckboxes();
    renderSettingsCustomFields();
  }
}

function showFormView() {
  const jobForm = document.getElementById("jobForm");
  const settingsView = document.getElementById("settingsView");
  if (jobForm && settingsView) {
    settingsView.style.display = "none";
    jobForm.style.display = "block";
    applyFieldVisibility();
    renderCustomFields();
  }
}

async function updateCustomFieldState(fieldId, enabled) {
  if (!tableCustomFields) tableCustomFields = [];
  const idx = tableCustomFields.findIndex(f => f.id === fieldId);
  if (idx >= 0) {
    tableCustomFields[idx].enabled = enabled;
  } else {
    tableCustomFields.push({ id: fieldId, name: fieldId, enabled });
  }
  await chrome.storage.local.set({ customFields: tableCustomFields });
}

function setupSettingsEvents() {
  const toggleBtn = document.getElementById("toggleSettingsBtn");
  const closeBtn = document.getElementById("closeSettingsBtn");
  const settingsView = document.getElementById("settingsView");

  toggleBtn?.addEventListener("click", () => {
    if (settingsView.style.display === "none") {
      showSettingsView();
    } else {
      showFormView();
    }
  });

  closeBtn?.addEventListener("click", showFormView);

  document.getElementById("settingSalary")?.addEventListener("change", async (e) => {
    isSalaryActive = e.target.checked;
    await updateCustomFieldState("salary", isSalaryActive);
    applyFieldVisibility();
  });

  document.getElementById("settingLocation")?.addEventListener("change", async (e) => {
    isLocationActive = e.target.checked;
    await updateCustomFieldState("location", isLocationActive);
    applyFieldVisibility();
  });

  document.getElementById("settingUrl")?.addEventListener("change", async (e) => {
    isUrlActive = e.target.checked;
    if (!tableStandardColumns) tableStandardColumns = {};
    tableStandardColumns.url = isUrlActive;
    await chrome.storage.local.set({ standardColumns: tableStandardColumns });
    applyFieldVisibility();
  });

  document.getElementById("settingReqs")?.addEventListener("change", async (e) => {
    extensionSettings.extractRequirements = e.target.checked;
    await chrome.storage.local.set({ extensionSettings });
    applyFieldVisibility();
    syncExtensionSettingsToOpenTabs(extensionSettings);
  });

  document.getElementById("settingNotes")?.addEventListener("change", async (e) => {
    isNotesActive = e.target.checked;
    await updateCustomFieldState("notes", isNotesActive);
    applyFieldVisibility();
  });

  const addBtn = document.getElementById("addCustomFieldBtn");
  const nameInput = document.getElementById("newCustomFieldNameInput");

  async function handleAddCustomField() {
    const rawName = nameInput?.value?.trim();
    if (!rawName) return;

    const id = rawName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/^_+|_+$/g, "") || `custom_${Date.now()}`;
    if (!extensionCustomFields.some(f => f.id === id)) {
      const newField = { id, name: rawName };
      extensionCustomFields.push(newField);
      await chrome.storage.local.set({ extensionCustomFields });
      nameInput.value = "";
      renderSettingsCustomFields();
      renderCustomFields();
      syncNewFieldToOpenTabs(newField);
    }
  }

  addBtn?.addEventListener("click", handleAddCustomField);
  nameInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustomField();
    }
  });
}

async function syncExtensionSettingsToOpenTabs(settings) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const t of tabs) {
      if (t.id && t.url && (t.url.includes("localhost") || t.url.includes("127.0.0.1") || t.url.includes("jobtrace") || t.url.includes("job-trace") || t.url.includes("vercel.app"))) {
        chrome.scripting.executeScript({
          target: { tabId: t.id },
          func: (s) => {
            try {
              localStorage.setItem("jobtrace_extension_settings", JSON.stringify(s));
            } catch (e) {}
          },
          args: [settings]
        }).catch(() => {});
      }
    }
  } catch (e) {}
}

async function syncNewFieldToOpenTabs(newField) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const t of tabs) {
      if (t.url && (t.url.includes("localhost") || t.url.includes("jobtrace") || t.url.includes("job-trace") || t.url.includes("vercel.app"))) {
        chrome.scripting.executeScript({
          target: { tabId: t.id },
          func: (field) => {
            try {
              const raw = localStorage.getItem("jobtrace_custom_fields_v2");
              const fields = raw ? JSON.parse(raw) : [];
              if (!fields.some(f => f.id === field.id)) {
                fields.push({ id: field.id, name: field.name, type: "text", enabled: true });
                localStorage.setItem("jobtrace_custom_fields_v2", JSON.stringify(fields));
              }
            } catch (e) {}
          },
          args: [newField]
        }).catch(() => {});
      }
    }
  } catch (e) {}
}

// Sync settings from active JobTrace tab or storage
async function loadSettings() {
  try {
    // 1. Check local extension storage first
    const stored = await chrome.storage.local.get([
      "extensionSettings",
      "userId",
      "authToken",
      "standardColumns",
      "customFields",
      "cachedApplications",
    ]);
    if (stored.extensionSettings) {
      extensionSettings = { ...extensionSettings, ...stored.extensionSettings };
    }
    if (stored.userId) {
      currentUserId = stored.userId;
    }
    let currentAuthToken = stored.authToken || null;
    if (stored.standardColumns) {
      tableStandardColumns = stored.standardColumns;
    }
    if (stored.customFields) {
      tableCustomFields = stored.customFields;
    }
    if (stored.cachedApplications && Array.isArray(stored.cachedApplications) && stored.cachedApplications.length > 0) {
      cachedApplications = stored.cachedApplications;
    }

    // 2. Query open tabs to sync live settings, auth, and applications from JobTrace web app
    const tabs = await chrome.tabs.query({});
    for (const t of tabs) {
      if (
        t.url &&
        (t.url.includes("localhost") ||
         t.url.includes("127.0.0.1") ||
         t.url.includes("jobtrace") ||
         t.url.includes("job-trace") ||
         t.url.includes("vercel.app") ||
         (t.title && /job\s*trace/i.test(t.title)))
      ) {
        try {
          const [res] = await chrome.scripting.executeScript({
            target: { tabId: t.id },
            func: () => {
              const ext = localStorage.getItem("jobtrace_extension_settings");
              const stdCols = localStorage.getItem("jobtrace_standard_columns");
              const customFields = localStorage.getItem("jobtrace_custom_fields_v2");
              const cachedAppsRaw = localStorage.getItem("jobtrace_cached_applications");

              let auth = null;
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
                  auth = localStorage.getItem(key);
                  break;
                }
              }
              if (!auth) auth = localStorage.getItem("sb-gphwulqaetaxxmzfurlr-auth-token");

              let uid = null;
              let token = null;
              if (auth) {
                try {
                  const parsed = JSON.parse(auth);
                  uid = parsed?.user?.id || parsed?.id || null;
                  token = parsed?.access_token || null;
                } catch (e) {}
              }

              let apps = null;
              if (cachedAppsRaw) {
                try { apps = JSON.parse(cachedAppsRaw); } catch (e) {}
              }

              return {
                settings: ext ? JSON.parse(ext) : null,
                standardColumns: stdCols ? JSON.parse(stdCols) : null,
                customFields: customFields ? JSON.parse(customFields) : null,
                cachedApplications: Array.isArray(apps) && apps.length > 0 ? apps : null,
                userId: uid,
                authToken: token,
              };
            }
          });

          if (res?.result) {
            const r = res.result;
            if (r.settings && !stored.extensionSettings) {
              extensionSettings = { ...extensionSettings, ...r.settings };
              chrome.storage.local.set({ extensionSettings });
            } else if (stored.extensionSettings) {
              syncExtensionSettingsToOpenTabs(stored.extensionSettings);
            }
            if (r.standardColumns) {
              tableStandardColumns = r.standardColumns;
              chrome.storage.local.set({ standardColumns: tableStandardColumns });
            }
            if (r.customFields) {
              tableCustomFields = r.customFields;
              chrome.storage.local.set({ customFields: tableCustomFields });
            }
            if (r.userId) {
              currentUserId = r.userId;
              chrome.storage.local.set({ userId: currentUserId });
            }
            if (r.authToken) {
              currentAuthToken = r.authToken;
              chrome.storage.local.set({ authToken: currentAuthToken });
            }
            if (r.cachedApplications && r.cachedApplications.length > 0) {
              cachedApplications = r.cachedApplications;
              chrome.storage.local.set({ cachedApplications });
            }
          }
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn("Could not sync settings:", err);
  }

  // Compute active status of fields according to user tracker settings
  isSalaryActive = tableCustomFields
    ? tableCustomFields.some(f => f.id === "salary" && f.enabled)
    : true;
  isLocationActive = tableCustomFields
    ? tableCustomFields.some(f => f.id === "location" && f.enabled)
    : true;
  isUrlActive = tableStandardColumns
    ? tableStandardColumns.url !== false
    : true;
  isNotesActive = tableCustomFields
    ? tableCustomFields.some(f => f.id === "notes" && f.enabled)
    : true;

  // Toggle DOM groups and adapt row grid layout
  applyFieldVisibility();

  // Load custom fields
  const storedFields = (await chrome.storage.local.get(["extensionCustomFields"])).extensionCustomFields || [];
  extensionCustomFields = [...storedFields];

  // Merge any active custom fields from dashboard if present
  if (tableCustomFields && Array.isArray(tableCustomFields)) {
    tableCustomFields.forEach(f => {
      if (f.enabled && !["salary", "location", "notes"].includes(f.id)) {
        if (!extensionCustomFields.some(existing => existing.id === f.id)) {
          extensionCustomFields.push({ id: f.id, name: f.name || f.id });
        }
      }
    });
  }
  renderCustomFields();

  // Load cached applications from Supabase if not already available in cache
  if (!cachedApplications || cachedApplications.length === 0) {
    try {
      const stored = await chrome.storage.local.get(["authToken", "userId"]);
      const token = stored.authToken || null;
      const uid = stored.userId || currentUserId;

      let query = `${CONFIG.SUPABASE_URL}/rest/v1/applications?select=id,company,role,applied_date,url,custom_fields&order=applied_date.desc&limit=1500`;
      if (uid) query += `&user_id=eq.${uid}`;
      const res = await fetch(query, {
        headers: {
          "apikey": CONFIG.SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${token || CONFIG.SUPABASE_ANON_KEY}`,
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          cachedApplications = data;
          await chrome.storage.local.set({ cachedApplications });
        }
      }
    } catch (e) {}
  }
}

// Scrape active page and populate form
async function captureActiveTab() {
  const statusMsg = document.getElementById("statusMsg");
  statusMsg.className = "status-msg info";
  statusMsg.textContent = "Scanning page...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      statusMsg.className = "status-msg error";
      statusMsg.textContent = "Cannot access active tab.";
      return;
    }

    // Guard against browser internal schemes
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("chrome-extension://") || tab.url.startsWith("about:")) {
      statusMsg.className = "status-msg info";
      statusMsg.textContent = "Navigate to a job posting tab to capture.";
      return;
    }

    // Default URL to tab URL if target enabled
    const urlInput = document.getElementById("url");
    if (urlInput && isUrlActive && tab.url) urlInput.value = tab.url;

    // Run extractor in tab
    const [execution] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapePageDetails
    });

    const data = execution?.result || {};

    const companyInput = document.getElementById("company");
    const roleInput = document.getElementById("role");
    const salaryInput = document.getElementById("salary");
    const locationInput = document.getElementById("location");

    let companyVal = (data.company || "").trim();
    if (!companyVal && tab.url) {
      const wdMatch = tab.url.match(/https?:\/\/([a-z0-9_-]+?)(?:\.wd\d+)?\.myworkdayjobs\.com/i);
      if (wdMatch && wdMatch[1]) {
        let s = wdMatch[1].replace(/[-_]/g, " ").replace(/\b(careers?|jobs?)\b/gi, "").trim();
        companyVal = s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
      }
    }

    if (companyVal) {
      companyVal = findBestMatchingCompany(companyVal, cachedApplications);
    }

    if (companyInput && companyVal) companyInput.value = companyVal;
    if (roleInput && data.role) roleInput.value = data.role.trim();
    if (salaryInput) salaryInput.value = isSalaryActive && data.salary ? data.salary.trim() : "";
    if (locationInput) locationInput.value = isLocationActive && data.location ? data.location.trim() : "";
    if (urlInput) urlInput.value = isUrlActive ? (data.url || tab.url || "") : "";
    currentJobId = data.jobId || extractJobIdFromUrl(tab.url) || "";

    if (extensionSettings.extractRequirements && Array.isArray(data.keyRequirements)) {
      renderRequirements(data.keyRequirements);
    } else {
      renderRequirements([]);
    }

    checkDuplicate();

    statusMsg.className = "status-msg";
    statusMsg.style.display = "none";
  } catch (err) {
    console.error("Capture error:", err);
    statusMsg.className = "status-msg error";
    statusMsg.textContent = err?.message?.includes("Cannot access")
      ? "Cannot scan this page type. Fill fields manually."
      : "Could not scan page. Fill fields manually.";
  }
}

// Save application to Supabase
async function submitApplication() {
  const saveBtn = document.getElementById("saveBtn");
  const statusMsg = document.getElementById("statusMsg");
  const companyInput = document.getElementById("company");
  const roleInput = document.getElementById("role");
  const statusSelect = document.getElementById("status");
  const salaryInput = document.getElementById("salary");
  const locationInput = document.getElementById("location");
  const urlInput = document.getElementById("url");
  const notesInput = document.getElementById("notes");

  if (!companyInput.value.trim() || !roleInput.value.trim()) {
    statusMsg.className = "status-msg error";
    statusMsg.textContent = "Company and Role are required.";
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  const today = getLocalDateString();
  const newId = crypto.randomUUID();

  const customFieldsPayload = {};
  if (extensionSettings.extractRequirements && currentRequirements.length > 0) {
    customFieldsPayload._keyRequirements = JSON.stringify(currentRequirements);
  }

  // Collect values from all custom fields
  const customInputs = document.querySelectorAll(".custom-field-input");
  customInputs.forEach((input) => {
    const fieldId = input.getAttribute("data-id");
    const val = input.value.trim();
    if (fieldId && val) {
      customFieldsPayload[fieldId] = val;
    }
  });

  if (currentJobId) {
    customFieldsPayload.jobId = currentJobId;
  }

  const payload = {
    id: newId,
    company: companyInput.value.trim(),
    role: roleInput.value.trim(),
    status: statusSelect.value,
    applied_date: today,
    url: isUrlActive ? (urlInput?.value?.trim() || "#") : "#",
    salary: isSalaryActive ? (salaryInput?.value?.trim() || "") : "",
    location: isLocationActive ? (locationInput?.value?.trim() || "") : "",
    notes: isNotesActive ? (notesInput?.value?.trim() || "") : "",
    custom_fields: customFieldsPayload
  };

  if (currentUserId) {
    payload.user_id = currentUserId;
  }

  try {
    const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/applications`, {
      method: "POST",
      headers: {
        "apikey": CONFIG.SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errTxt = await response.text();
      throw new Error(errTxt || "Failed to save application");
    }

    // Update local cache
    cachedApplications.push({
      id: newId,
      company: payload.company,
      role: payload.role,
      applied_date: payload.applied_date,
      url: payload.url,
      custom_fields: customFieldsPayload
    });
    chrome.storage.local.set({ cachedApplications });

    // Notify any open JobTrace tabs to update immediately without needing a page refresh
    notifyOpenJobTraceTabs(payload);

    statusMsg.textContent = "Saved to your JobTrace dashboard!";
    statusMsg.className = "status-msg success";
    saveBtn.textContent = "Saved!";

    setTimeout(() => {
      window.close();
    }, 500);
  } catch (err) {
    console.error("Save error:", err);
    statusMsg.textContent = "Error saving. Check database connection.";
    statusMsg.className = "status-msg error";
    saveBtn.disabled = false;
    saveBtn.textContent = "Save to JobTrace";
  }
}

// Broadcast newly clipped application to open JobTrace dashboard tabs
async function notifyOpenJobTraceTabs(newJob) {
  try {
    if (typeof chrome === "undefined" || !chrome.tabs) return;
    const tabs = await chrome.tabs.query({});
    for (const t of tabs) {
      if (!t.id || !t.url) continue;
      const lower = t.url.toLowerCase();
      if (
        lower.includes("localhost") ||
        lower.includes("127.0.0.1") ||
        lower.includes("jobtrace") ||
        lower.includes("job-trace") ||
        lower.includes("vercel.app")
      ) {
        // Message content script
        try {
          chrome.tabs.sendMessage(t.id, {
            type: "JOBTRACE_APPLICATION_ADDED",
            payload: newJob
          }).catch(() => {});
        } catch (e) {}

        // Direct script execution fallback
        try {
          chrome.scripting.executeScript({
            target: { tabId: t.id },
            func: (job) => {
              try {
                window.dispatchEvent(new CustomEvent("jobtrace_application_added", { detail: job }));
              } catch (e) {}
            },
            args: [newJob]
          }).catch(() => {});
        } catch (e) {}
      }
    }
  } catch (e) {}
}

document.addEventListener("DOMContentLoaded", async () => {
  setupSettingsEvents();

  // Attach live duplicate check on inputs
  ["company", "role"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", checkDuplicate);
  });
  document.getElementById("url")?.addEventListener("input", () => {
    const urlVal = document.getElementById("url")?.value || "";
    if (urlVal) {
      const extracted = extractJobIdFromUrl(urlVal);
      if (extracted) currentJobId = extracted;
    }
    checkDuplicate();
  });

  await loadSettings();
  applyFieldVisibility();
  await captureActiveTab();

  document.getElementById("reCaptureBtn").addEventListener("click", captureActiveTab);
  document.getElementById("jobForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitApplication();
  });
});
