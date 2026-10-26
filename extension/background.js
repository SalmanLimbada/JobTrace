// JobTrace - Background Service Worker
// Watches tab navigation and updates the toolbar badge (!) when viewing an already-applied job

function extractJobId(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const url = rawUrl.trim();
  if (url === "#" || url === "" || url.toLowerCase() === "n/a") return null;

  // 1. Standard Requisition prefixes (JR102948, REQ-84920, R-12345, R102948)
  const reqMatch = url.match(/(?:_|\/|-|\b)(JR\d{4,}|REQ-?\d{4,}|R-?\d{4,})(?:[/?#&_\s]|$)/i);
  if (reqMatch) return reqMatch[1].toUpperCase();

  // 2. Query parameters used across all major ATS platforms:
  // Greenhouse (gh_jid), Indeed (jk), LinkedIn (currentJobId), Taleo (job, reqId), Oracle (reqId, postingId), etc.
  try {
    const parsed = new URL(url.startsWith("http") ? url : "https://" + url);
    const qParams = [
      "gh_jid", "jk", "jobid", "job_id", "jobopeningid", "job_opening_id",
      "postingid", "posting_id", "reqid", "req_id", "requisitionid", "requisition_id",
      "currentjobid", "job", "id"
    ];
    for (const [k, v] of parsed.searchParams.entries()) {
      if (qParams.includes(k.toLowerCase()) && v && v.length >= 3) {
        return v.toUpperCase();
      }
    }
  } catch (e) {}

  // 3. UUIDs in path (Lever, Ashby, SmartRecruiters: /jobs/uuid, /company/uuid, etc.)
  const uuidMatch = url.match(/\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:[/?#]|$)/i);
  if (uuidMatch) return uuidMatch[1].toUpperCase();

  // 4. LinkedIn view (/jobs/view/123456789)
  const liMatch = url.match(/\/jobs\/view\/(\d{6,})/i);
  if (liMatch) return liMatch[1];

  // 5. Workday slug ending in numeric or alphanumeric ID (e.g. _1039072, _JR12345)
  const wdSlugMatch = url.match(/_([A-Za-z0-9]{5,})(?:[/?#]|$)/);
  if (wdSlugMatch) return wdSlugMatch[1].toUpperCase();

  // 6. Workable (/j/9A8B7C6D5E)
  const workableMatch = url.match(/\/j\/([A-Za-z0-9]{8,})(?:[/?#]|$)/i);
  if (workableMatch) return workableMatch[1].toUpperCase();

  // 7. Generic /jobs/12345, /apply/12345, /careers/12345, /posting/12345 (Greenhouse, BambooHR, iCIMS, SmartRecruiters)
  const pathIdMatch = url.match(/\/(?:jobs|apply|careers|posting|job)\/(\d{3,})(?:[/?#]|$)/i);
  if (pathIdMatch) return pathIdMatch[1];

  // 8. SmartRecruiters numeric ID in slug (e.g. /743999999999-role-title)
  const srMatch = url.match(/\/(\d{10,})(?:-[a-z0-9-]+)?(?:[/?#]|$)/i);
  if (srMatch) return srMatch[1];

  return null;
}

function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  try {
    const u = new URL(rawUrl);
    if (!u.protocol.startsWith("http")) return "";
    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "ref", "referrer", "trackingid", "trk", "source", "gh_src", "lever-source",
      "fbclid", "gclid", "msclkid"
    ];
    for (const p of trackingParams) {
      u.searchParams.delete(p);
    }
    const search = u.searchParams.toString();
    const pathname = u.pathname.replace(/\/+$/, "");
    return `${u.hostname.replace(/^www\./, "")}${pathname}${search ? "?" + search : ""}`.toLowerCase();
  } catch (e) {
    return rawUrl.trim().toLowerCase();
  }
}

function findMatchingApplication(url, applications, tabTitle = "") {
  if (!url || !Array.isArray(applications) || applications.length === 0) return null;
  const targetNorm = normalizeUrl(url);
  const targetId = extractJobId(url);
  const cleanTitle = tabTitle ? tabTitle.toLowerCase().replace(/[^a-z0-9]/g, "") : "";

  for (const app of applications) {
    // 1. Direct normalized URL match
    if (app.url && targetNorm) {
      const appNorm = normalizeUrl(app.url);
      if (appNorm && appNorm === targetNorm) return app;
    }

    // 2. Job ID match from URL, slug, or custom field
    const appId = (
      app.custom_fields?.jobId ||
      app.customFields?.jobId ||
      extractJobId(app.url) ||
      ""
    ).trim().toUpperCase();

    if (targetId && appId && targetId === appId) {
      return app;
    }

    // 3. Fallback when URL was toggled OFF: Match by Tab Title containing Company & Role
    if (cleanTitle && app.company && app.role) {
      const compClean = app.company.toLowerCase().replace(/[^a-z0-9]/g, "");
      const roleClean = app.role.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (compClean.length >= 3 && roleClean.length >= 6) {
        if (cleanTitle.includes(compClean) && cleanTitle.includes(roleClean)) {
          return app;
        }
      }
    }
  }
  return null;
}

async function checkTab(tabId, url, tabTitle = "") {
  if (!tabId || !url || url.startsWith("chrome://") || url.startsWith("edge://") || url.startsWith("about:") || url.includes("jobtrace")) {
    chrome.action.setBadgeText({ tabId, text: "" });
    chrome.action.setTitle({ tabId, title: "JobTrace" });
    return;
  }

  const { cachedApplications } = await chrome.storage.local.get(["cachedApplications"]);
  const match = findMatchingApplication(url, cachedApplications, tabTitle);

  if (match) {
    chrome.action.setBadgeText({ tabId, text: "!" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#f59e0b" });
    const comp = match.company || "Company";
    const role = match.role ? ` (${match.role})` : "";
    const date = match.applied_date || match.appliedDate || "";
    const dateStr = date ? ` on ${date}` : "";
    chrome.action.setTitle({ tabId, title: `⚠️ JobTrace: Already applied to ${comp}${role}${dateStr}` });
  } else {
    chrome.action.setBadgeText({ tabId, text: "" });
    chrome.action.setTitle({ tabId, title: "JobTrace" });
  }
}

// Check when tab navigates or finishes loading
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    checkTab(tabId, tab.url || changeInfo.url, tab.title || "");
  }
});

// Check when switching active tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab?.url) checkTab(tab.id, tab.url, tab.title || "");
  } catch (e) {}
});

// Update active tab badge when applications cache changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.cachedApplications) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id && tabs[0]?.url) {
        checkTab(tabs[0].id, tabs[0].url, tabs[0].title || "");
      }
    });
  }
});
