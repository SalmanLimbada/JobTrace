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
    const JUNK_COMPANY_REGEX = /^(careers?|jobs?|apply|job search|search|welcome|candidate home|portal|dashboard|search jobs|current openings|join us|work with us|job opportunities|opportunities|workday|logo|company logo|myworkdayjobs|home|back|sign in|login)$/i;

    function isValidCompany(name) {
      if (!name || typeof name !== "string") return false;
      const t = name.trim();
      if (t.length < 2 || t.length > 70) return false;
      return !JUNK_COMPANY_REGEX.test(t);
    }

    const result = {
      company: "",
      role: "",
      url: window.location.href,
      location: "",
      salary: "",
      notes: "",
      keyRequirements: []
    };

    // 1. Schema.org JSON-LD
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      try {
        let json = JSON.parse(s.textContent || "{}");
        if (Array.isArray(json)) json = json.find(j => j && j["@type"] === "JobPosting") || json[0];
        if (json && json["@graph"]) json = json["@graph"].find(j => j && j["@type"] === "JobPosting") || json;

        if (json && (json["@type"] === "JobPosting" || json.title || json.hiringOrganization)) {
          if (json.title && !result.role) result.role = json.title;
          if (json.hiringOrganization) {
            const org = typeof json.hiringOrganization === "string" ? json.hiringOrganization : json.hiringOrganization.name;
            if (org && isValidCompany(org) && !result.company) result.company = org.trim();
          }
          if (json.jobLocation) {
            let loc = "";
            const addr = json.jobLocation.address;
            if (typeof addr === "string") loc = addr;
            else if (addr && typeof addr === "object") {
              loc = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(", ");
            }
            if (loc && !result.location) result.location = loc;
          }
          if (json.baseSalary) {
            const val = json.baseSalary.value;
            if (typeof val === "object" && (val.minValue || val.value)) {
              const cur = json.baseSalary.currency || "$";
              result.salary = `${cur}${val.minValue || val.value}${val.maxValue ? " - " + cur + val.maxValue : ""}`;
            } else if (typeof val === "string" || typeof val === "number") {
              result.salary = String(val);
            }
          }
          if (json.description && result.keyRequirements.length === 0) {
            const tmp = document.createElement("div");
            tmp.innerHTML = json.description;
            const lis = tmp.querySelectorAll("li");
            if (lis.length > 0) {
              const bullets = Array.from(lis)
                .map(li => li.textContent.trim())
                .filter(t => t.length > 15 && t.length < 250);
              if (bullets.length > 0) result.keyRequirements = bullets.slice(0, 8);
            }
          }
        }
      } catch (e) {}
    }
  } catch (e) {}

  // 2. High-accuracy platform selectors
  const host = window.location.hostname.toLowerCase();

  if (host.includes("linkedin.com")) {
    const titleEl = document.querySelector(".job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.topcard__title, .t-24.job-details-jobs-unified-top-card__job-title");
    if (titleEl && !result.role) result.role = titleEl.textContent.trim();

    const companyEl = document.querySelector(".job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .topcard__org-name-link");
    if (companyEl && !result.company) {
      const c = companyEl.textContent.trim();
      if (isValidCompany(c)) result.company = c;
    }

    const locEl = document.querySelector(".job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet, .topcard__flavor--bullet");
    if (locEl && !result.location) result.location = locEl.textContent.trim();
  } else if (host.includes("indeed.com")) {
    const titleEl = document.querySelector("h1.jobsearch-JobInfoHeader-title, [data-testid='jobsearch-JobInfoHeader-title']");
    if (titleEl && !result.role) result.role = titleEl.textContent.trim();

    const companyEl = document.querySelector("[data-testid='inlineHeader-companyName'], .jobsearch-InlineCompanyRating-companyHeader");
    if (companyEl && !result.company) {
      const c = companyEl.textContent.trim();
      if (isValidCompany(c)) result.company = c;
    }

    const locEl = document.querySelector("[data-testid='inlineHeader-companyLocation'], #inlineHeader-companyLocation");
    if (locEl && !result.location) result.location = locEl.textContent.trim();
  } else if (host.includes("greenhouse.io")) {
    const titleEl = document.querySelector(".app-title, h1.job-title");
    if (titleEl && !result.role) result.role = titleEl.textContent.trim();

    const companyEl = document.querySelector(".company-name");
    if (companyEl && !result.company) {
      const c = companyEl.textContent.trim();
      if (isValidCompany(c)) result.company = c;
    }

    const locEl = document.querySelector(".location");
    if (locEl && !result.location) result.location = locEl.textContent.trim();
  } else if (host.includes("lever.co")) {
    const titleEl = document.querySelector(".posting-headline h2");
    if (titleEl && !result.role) result.role = titleEl.textContent.trim();

    const companyEl = document.querySelector(".main-header-logo img")?.getAttribute("alt") || document.querySelector(".posting-header .company");
    if (companyEl && !result.company) {
      const cName = typeof companyEl === "string" ? companyEl : companyEl.textContent;
      const clean = cName.replace(/ logo/i, "").trim();
      if (isValidCompany(clean)) result.company = clean;
    }

    const locEl = document.querySelector(".posting-categories .location");
    if (locEl && !result.location) result.location = locEl.textContent.trim();
  } else if (host.includes("ashbyhq.com")) {
    const titleEl = document.querySelector("h1");
    if (titleEl && !result.role) result.role = titleEl.textContent.trim();

    const locEl = document.querySelector("[class*='location'], [class*='Location']");
    if (locEl && !result.location) result.location = locEl.textContent.trim();
  } else if (host.includes("myworkdayjobs.com") || host.includes("workday")) {
    // Workday specific extraction
    // 1. Banner logo alt or title
    const bannerImg = document.querySelector('[data-automation-id="bannerLogo"] img, header img[alt], [data-automation-id="legalEntityBanner"] img, [data-automation-id="logo"] img');
    const alt = bannerImg?.getAttribute("alt") || bannerImg?.getAttribute("title");
    if (alt) {
      const cleanAlt = alt.replace(/\s*(?:logo|icon|home|banner)\s*/gi, "").trim();
      if (isValidCompany(cleanAlt)) result.company = cleanAlt;
    }

    // 2. Banner text / legal entity
    if (!result.company) {
      const bannerEl = document.querySelector('[data-automation-id="legalEntityBanner"], [data-automation-id="bannerLogo"]');
      if (bannerEl) {
        const txt = bannerEl.textContent.trim().replace(/\s*(?:Careers|Jobs|Home)\s*$/i, "").trim();
        if (isValidCompany(txt)) result.company = txt;
      }
    }

    // 3. Subdomain extraction: e.g. "perseusgroup.wd3.myworkdayjobs.com"
    if (!result.company) {
      const wdHostMatch = window.location.hostname.match(/^([a-z0-9_-]+?)(?:\.wd\d+)?\.myworkdayjobs\.com/i);
      if (wdHostMatch && wdHostMatch[1]) {
        let slug = wdHostMatch[1].replace(/[-_]/g, " ");
        slug = slug.replace(/\bgroup\b/i, " Group").replace(/\b(careers?|jobs?)\b/gi, "").trim();
        const formatted = slug.replace(/\b[a-z]/g, (c) => c.toUpperCase());
        if (isValidCompany(formatted)) result.company = formatted;
      }
    }

    // 4. Path extraction e.g. /en-US/Perseus-careers1/job/...
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
  }

  // 3. Generic DOM fallbacks
  if (!result.role) {
    const h1 = document.querySelector("h1");
    if (h1 && h1.textContent.trim().length > 2 && h1.textContent.trim().length < 120) {
      result.role = h1.textContent.trim();
    } else {
      let t = document.title || "";
      t = t.replace(/\s*[-–|•]\s*(LinkedIn|Indeed|Glassdoor|Greenhouse|Lever|Ashby|Workday|Jobs).*$/i, "");
      const parts = t.split(/\s*[-–|]\s*/);
      if (parts.length >= 2) {
        result.role = parts[0].trim();
        if (!result.company) {
          const compCandidate = parts[1].replace(/\b(Jobs|Careers|Indeed|LinkedIn|Workday)\b/gi, "").trim();
          if (isValidCompany(compCandidate)) result.company = compCandidate;
        }
      } else {
        result.role = t.trim();
      }
    }
  }

  // Robust company detection across any page
  if (!result.company) {
    // A. Logo image alt text
    const logoImg = document.querySelector('header a img[alt], [class*="header"] a img[alt], [class*="nav"] a img[alt], [class*="logo"] img[alt], a[class*="brand"] img[alt], a[class*="logo"] img[alt]');
    const alt = logoImg?.getAttribute("alt") || logoImg?.getAttribute("title");
    if (alt) {
      const clean = alt.replace(/\s*(?:logo|icon|image|home|avatar)\s*/gi, "").trim();
      if (isValidCompany(clean)) result.company = clean;
    }
  }

  if (!result.company) {
    // B. Top-left brand / logo text
    const brandEl = document.querySelector('header a, nav a, [class*="brand"], [class*="logo"]');
    if (brandEl) {
      const txt = brandEl.textContent.trim().replace(/\s*(?:Careers|Jobs|Home|Portal)\s*$/i, "").trim();
      if (isValidCompany(txt)) result.company = txt;
    }
  }

  if (!result.company) {
    // C. Dedicated company data attributes and selectors
    const compEl = document.querySelector('[data-company], [class*="company-name"], [class*="companyName"], [class*="employer-name"], [data-automation-id*="company"]');
    if (compEl) {
      const txt = compEl.textContent.trim();
      if (isValidCompany(txt)) result.company = txt;
    }
  }

  if (!result.company) {
    // D. OpenGraph site name or title split
    const metaSite = document.querySelector("meta[property='og:site_name']")?.getAttribute("content");
    if (metaSite && isValidCompany(metaSite)) {
      result.company = metaSite.trim();
    } else {
      const parts = document.title.split(/\s*[-–|]\s*/);
      if (parts.length >= 2) {
        const compCandidate = parts[1].replace(/\b(Jobs|Careers|Indeed|LinkedIn|Workday)\b/gi, "").trim();
        if (isValidCompany(compCandidate)) result.company = compCandidate;
      }
    }
  }

  if (!result.company) {
    // E. Text search for "About [Company]" or "[Company] is an Equal Opportunity"
    const bodyText = document.body.innerText || "";
    const eoeMatch = bodyText.match(/([A-Z][A-Za-z0-9\s&]{2,30}?)\s+is\s+an\s+equal\s+opportunity\s+employer/i);
    if (eoeMatch && isValidCompany(eoeMatch[1])) {
      result.company = eoeMatch[1].trim();
    } else {
      const aboutMatch = bodyText.match(/(?:About|Join)\s+([A-Z][A-Za-z0-9\s&]{2,25}?)(?:\s+is\b|\s*,|\s+we\b|\n)/);
      if (aboutMatch && isValidCompany(aboutMatch[1])) {
        result.company = aboutMatch[1].trim();
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

  // Requirements extraction fallback
  if (result.keyRequirements.length === 0) {
    const headings = Array.from(document.querySelectorAll("h2, h3, h4, strong, p"));
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
          .filter(t => t.length > 10 && t.length < 250);
        if (items.length > 0) {
          result.keyRequirements = items.slice(0, 8);
        }
      }
    }
  }

    return result;
  } catch (err) {
    return {
      company: "",
      role: document.title || "",
      url: window.location.href,
      location: "",
      salary: "",
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
let isSalaryActive = true;
let isLocationActive = true;
let isUrlActive = true;
let isNotesActive = true;

// Sync settings from active JobTrace tab or storage
async function loadSettings() {
  try {
    // 1. Check local extension storage first
    const stored = await chrome.storage.local.get(["extensionSettings", "userId", "standardColumns", "customFields"]);
    if (stored.extensionSettings) {
      extensionSettings = { ...extensionSettings, ...stored.extensionSettings };
    }
    if (stored.userId) {
      currentUserId = stored.userId;
    }
    if (stored.standardColumns) {
      tableStandardColumns = stored.standardColumns;
    }
    if (stored.customFields) {
      tableCustomFields = stored.customFields;
    }

    // 2. Query open tabs to sync live settings and auth from JobTrace web app
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
              const auth = localStorage.getItem("sb-gphwulqaetaxxmzfurlr-auth-token");
              let uid = null;
              if (auth) {
                try {
                  const parsed = JSON.parse(auth);
                  uid = parsed?.user?.id || parsed?.id || null;
                } catch (e) {}
              }
              return {
                settings: ext ? JSON.parse(ext) : null,
                standardColumns: stdCols ? JSON.parse(stdCols) : null,
                customFields: customFields ? JSON.parse(customFields) : null,
                userId: uid
              };
            }
          });

          if (res?.result?.settings) {
            extensionSettings = { ...extensionSettings, ...res.result.settings };
            await chrome.storage.local.set({ extensionSettings });
          }
          if (res?.result?.standardColumns) {
            tableStandardColumns = res.result.standardColumns;
            await chrome.storage.local.set({ standardColumns: tableStandardColumns });
          }
          if (res?.result?.customFields) {
            tableCustomFields = res.result.customFields;
            await chrome.storage.local.set({ customFields: tableCustomFields });
          }
          if (res?.result?.userId) {
            currentUserId = res.result.userId;
            await chrome.storage.local.set({ userId: currentUserId });
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

    if (companyInput && data.company) companyInput.value = data.company;
    if (roleInput && data.role) roleInput.value = data.role;
    if (salaryInput) salaryInput.value = isSalaryActive && data.salary ? data.salary : "";
    if (locationInput) locationInput.value = isLocationActive && data.location ? data.location : "";
    if (urlInput) urlInput.value = isUrlActive ? (data.url || tab.url || "") : "";

    if (extensionSettings.extractRequirements && Array.isArray(data.keyRequirements)) {
      renderRequirements(data.keyRequirements);
    } else {
      renderRequirements([]);
    }

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

  const today = new Date().toISOString().split("T")[0];
  const newId = crypto.randomUUID();

  const customFieldsPayload = {};
  if (extensionSettings.extractRequirements && currentRequirements.length > 0) {
    customFieldsPayload._keyRequirements = JSON.stringify(currentRequirements);
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

    statusMsg.textContent = "Saved to your JobTrace dashboard!";
    statusMsg.className = "status-msg success";
    saveBtn.textContent = "Saved!";

    setTimeout(() => {
      window.close();
    }, 1200);
  } catch (err) {
    console.error("Save error:", err);
    statusMsg.textContent = "Error saving. Check database connection.";
    statusMsg.className = "status-msg error";
    saveBtn.disabled = false;
    saveBtn.textContent = "Save to JobTrace";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  await captureActiveTab();

  document.getElementById("reCaptureBtn").addEventListener("click", captureActiveTab);
  document.getElementById("jobForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitApplication();
  });
});
