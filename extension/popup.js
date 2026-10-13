document.addEventListener("DOMContentLoaded", async () => {
  const companyInput = document.getElementById("company");
  const roleInput = document.getElementById("role");
  const urlInput = document.getElementById("url");
  const statusSelect = document.getElementById("status");
  const notesInput = document.getElementById("notes");
  const form = document.getElementById("jobForm");
  const saveBtn = document.getElementById("saveBtn");
  const statusMsg = document.getElementById("statusMsg");

  // 1. Auto-detect from active tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      urlInput.value = tab.url;

      // Parse common job site titles
      const title = tab.title || "";
      if (title.includes(" | LinkedIn")) {
        // Example: "Software Engineer - San Francisco | Stripe | LinkedIn"
        const clean = title.replace(" | LinkedIn", "");
        const parts = clean.split(" at ").length > 1 ? clean.split(" at ") : clean.split(" - ");
        if (parts.length >= 2) {
          roleInput.value = parts[0].trim();
          companyInput.value = parts[1].replace(/\|.*/, "").trim();
        } else {
          roleInput.value = clean.trim();
        }
      } else if (title.includes(" - Indeed")) {
        // Example: "Software Engineer - Google - Indeed.com"
        const parts = title.replace(" - Indeed.com", "").replace(" - Indeed", "").split(" - ");
        if (parts.length >= 2) {
          roleInput.value = parts[0].trim();
          companyInput.value = parts[1].trim();
        } else {
          roleInput.value = parts[0].trim();
        }
      } else if (title) {
        // Fallback: populate role with page title
        roleInput.value = title.trim();
      }
    }
  } catch (err) {
    console.warn("Could not query active tab:", err);
  }

  // 2. Submit to Supabase REST API
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
    statusMsg.className = "status-msg";
    statusMsg.textContent = "";

    const today = new Date().toISOString().split("T")[0];
    const newId = crypto.randomUUID();

    const payload = {
      id: newId,
      company: companyInput.value.trim(),
      role: roleInput.value.trim(),
      status: statusSelect.value,
      applied_date: today,
      url: urlInput.value.trim() || "#",
      notes: notesInput.value.trim() || "",
    };

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
        const errorText = await response.text();
        throw new Error(errorText || "Failed to save application");
      }

      statusMsg.textContent = "Saved to your tracker!";
      statusMsg.className = "status-msg success";
      saveBtn.textContent = "Saved!";

      setTimeout(() => {
        window.close();
      }, 1500);
    } catch (err) {
      console.error("Save error:", err);
      statusMsg.textContent = "Error saving. Check database connection.";
      statusMsg.className = "status-msg error";
      saveBtn.disabled = false;
      saveBtn.textContent = "Save to Tracker";
    }
  });
});
