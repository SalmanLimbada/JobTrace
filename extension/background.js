// JobTrace - Background Service Worker
// Watches tab navigation and updates the toolbar badge (!) when viewing an already-applied job

function extractJobId(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const url = rawUrl.trim();
  if (url === "#" || url === "" || url.toLowerCase() === "n/a") return null;

  const reqMatch = url.match(/(?:_|\/|-|\b)(JR\d{4,}|REQ-?\d{4,}|R-?\d{4,})(?:[/?#&_\s]|$)/i);
  if (reqMatch) return reqMatch[1].toUpperCase();

  try {
    const parsed = new URL(url.startsWith("http") ? url : "https://" + url);
    const qParams = [
      "jobid", "job_id", "jobopeningid", "job_opening_id", "postingid", "posting_id",
      "reqid", "req_id", "requisitionid", "requisition_id", "gh_jid", "jk", "currentjobid", "id"
    ];
    for (const [k, v] of parsed.searchParams.entries()) {
      if (qParams.includes(k.toLowerCase()) && v && v.length >= 3) {
        return v.toUpperCase();
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

function findMatchingApplication(url, applications) {
  if (!url || !Array.isArray(applications) || applications.length === 0) return null;
  const targetNorm = normalizeUrl(url);
  const targetId = extractJobId(url);

  for (const app of applications) {
    // 1. Direct normalized URL match
    if (app.url && targetNorm) {
      const appNorm = normalizeUrl(app.url);
      if (appNorm && appNorm === targetNorm) return app;
    }

    // 2. Job ID match from URL or custom field
    if (targetId) {
      const appId = (
        app.custom_fields?.jobId ||
        app.customFields?.jobId ||
        extractJobId(app.url) ||
        ""
      ).trim().toUpperCase();
      if (appId && appId === targetId) return app;
    }
  }
  return null;
}

async function checkTab(tabId, url) {
  if (!tabId || !url || url.startsWith("chrome://") || url.startsWith("edge://") || url.startsWith("about:") || url.includes("jobtrace")) {
    chrome.action.setBadgeText({ tabId, text: "" });
    chrome.action.setTitle({ tabId, title: "JobTrace" });
    return;
  }

  const { cachedApplications } = await chrome.storage.local.get(["cachedApplications"]);
  const match = findMatchingApplication(url, cachedApplications);

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
    checkTab(tabId, tab.url || changeInfo.url);
  }
});

// Check when switching active tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab?.url) checkTab(tab.id, tab.url);
  } catch (e) {}
});

// Update active tab badge when applications cache changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.cachedApplications) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id && tabs[0]?.url) {
        checkTab(tabs[0].id, tabs[0].url);
      }
    });
  }
});
