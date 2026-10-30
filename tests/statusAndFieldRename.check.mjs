import assert from "node:assert/strict";

console.log("Testing Status and Custom Field Rename Logic...");

// 1. Status Rename Logic Unit Test
function editStatus(statuses, jobsMap, oldName, newName) {
  const trimmed = newName.trim();
  if (!trimmed) return { success: false, reason: "empty" };
  if (trimmed === oldName) return { success: true, statuses, jobsMap };

  const exists = statuses.some(
    (s) => s.toLowerCase() !== oldName.toLowerCase() && s.toLowerCase() === trimmed.toLowerCase()
  );
  if (exists) return { success: false, reason: "duplicate" };

  const nextStatuses = statuses.map((s) => (s === oldName ? trimmed : s));

  // Migrate jobs
  const nextJobs = {};
  for (const [id, job] of Object.entries(jobsMap)) {
    nextJobs[id] = {
      ...job,
      status: job.status === oldName ? trimmed : job.status,
    };
  }

  return { success: true, statuses: nextStatuses, jobsMap: nextJobs };
}

// 2. Custom Field Rename Logic Unit Test
function editCustomField(fields, id, newName) {
  const trimmed = newName.trim();
  if (!trimmed) return { success: false, reason: "empty" };

  const current = fields.find((f) => f.id === id);
  if (!current) return { success: false, reason: "not_found" };
  if (trimmed === current.name) return { success: true, fields };

  const exists = fields.some(
    (f) => f.id !== id && f.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (exists) return { success: false, reason: "duplicate" };

  const nextFields = fields.map((f) => (f.id === id ? { ...f, name: trimmed } : f));
  return { success: true, fields: nextFields };
}

// Run Tests
{
  const initialStatuses = ["Applied", "Interveiw", "Offer", "Rejected"];
  const initialJobs = {
    job1: { id: "job1", company: "Acme", status: "Interveiw" },
    job2: { id: "job2", company: "Beta", status: "Applied" },
    job3: { id: "job3", company: "Gamma", status: "Interveiw" },
  };

  // Test 1: Fixing a typo in status name
  const res1 = editStatus(initialStatuses, initialJobs, "Interveiw", "Interview");
  assert.equal(res1.success, true);
  assert.deepEqual(res1.statuses, ["Applied", "Interview", "Offer", "Rejected"]);
  assert.equal(res1.jobsMap.job1.status, "Interview");
  assert.equal(res1.jobsMap.job2.status, "Applied");
  assert.equal(res1.jobsMap.job3.status, "Interview");

  // Test 2: Reject empty status name
  const resEmpty = editStatus(initialStatuses, initialJobs, "Interveiw", "   ");
  assert.equal(resEmpty.success, false);
  assert.equal(resEmpty.reason, "empty");

  // Test 3: Reject duplicate status name (case-insensitive)
  const resDup = editStatus(initialStatuses, initialJobs, "Interveiw", "applied");
  assert.equal(resDup.success, false);
  assert.equal(resDup.reason, "duplicate");

  // Test 4: Allow same name without error
  const resSame = editStatus(initialStatuses, initialJobs, "Applied", "Applied");
  assert.equal(resSame.success, true);

  console.log("✓ Status rename and migration tests passed!");
}

{
  const initialFields = [
    { id: "salary", name: "Sallary", type: "text", enabled: true },
    { id: "location", name: "Location", type: "text", enabled: true },
    { id: "deadlineDate", name: "Next Round", type: "date", enabled: false },
  ];

  // Test 5: Fixing a typo in custom field name
  const res1 = editCustomField(initialFields, "salary", "Salary");
  assert.equal(res1.success, true);
  const updatedField = res1.fields.find((f) => f.id === "salary");
  assert.equal(updatedField.name, "Salary");
  assert.equal(updatedField.id, "salary");
  assert.equal(updatedField.type, "text");
  assert.equal(updatedField.enabled, true);

  // Test 6: Reject empty field name
  const resEmpty = editCustomField(initialFields, "salary", "   ");
  assert.equal(resEmpty.success, false);
  assert.equal(resEmpty.reason, "empty");

  // Test 7: Reject duplicate field name
  const resDup = editCustomField(initialFields, "salary", "LOCATION");
  assert.equal(resDup.success, false);
  assert.equal(resDup.reason, "duplicate");

  // Test 8: Allow same name without error
  const resSame = editCustomField(initialFields, "location", "Location");
  assert.equal(resSame.success, true);

  console.log("✓ Custom field rename tests passed!");
}

console.log("All Status and Custom Field check tests passed successfully!");
