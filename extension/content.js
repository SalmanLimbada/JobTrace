// Content script for JobTrace web app
// Automatically syncs tracked columns and settings from the web dashboard into Chrome extension storage

(function () {
  function syncSettings() {
    try {
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

      const payload = {};
      if (ext) {
        try { payload.extensionSettings = JSON.parse(ext); } catch (e) {}
      }
      if (stdCols) {
        try { payload.standardColumns = JSON.parse(stdCols); } catch (e) {}
      }
      if (customFields) {
        try { payload.customFields = JSON.parse(customFields); } catch (e) {}
      }
      if (cachedAppsRaw) {
        try {
          const parsedApps = JSON.parse(cachedAppsRaw);
          if (Array.isArray(parsedApps) && parsedApps.length > 0) {
            payload.cachedApplications = parsedApps;
          }
        } catch (e) {}
      }
      if (uid) payload.userId = uid;
      if (token) payload.authToken = token;

      if (Object.keys(payload).length > 0 && typeof chrome !== "undefined" && chrome?.storage?.local) {
        chrome.storage.local.set(payload);
      }
    } catch (e) {}
  }

  // Initial sync when opening or refreshing dashboard
  syncSettings();

  // Listen for storage events and app events
  window.addEventListener("storage", syncSettings);
  window.addEventListener("jobtrace_settings_updated", syncSettings);

  // Listen for newly added applications from the extension popup
  if (typeof chrome !== "undefined" && chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === "JOBTRACE_APPLICATION_ADDED" && msg.payload) {
        try {
          window.dispatchEvent(new CustomEvent("jobtrace_application_added", { detail: msg.payload }));
        } catch (e) {}
      }
    });
  }
})();
