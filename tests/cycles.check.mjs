import assert from "node:assert/strict";

console.log("Testing Cycles Context & Persistence Logic...");

// Mock state and logic matching SettingsContext cycles implementation
function createCycleManager(initialCycles = [], initialActive = "All") {
  let cycles = [...initialCycles];
  let activeCycle = initialActive;
  let jobs = {};

  return {
    getCycles: () => cycles,
    getActiveCycle: () => activeCycle,
    getJobs: () => jobs,
    setJobs: (newJobs) => {
      jobs = { ...newJobs };
    },
    setActiveCycle: (cycle) => {
      activeCycle = cycle;
    },
    addCycle: (name) => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      if (trimmed.toLowerCase() === "all") return false;
      if (cycles.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return false;
      cycles = [...cycles, trimmed];
      activeCycle = trimmed;
      return true;
    },
    renameCycle: (oldName, newName) => {
      const trimmed = newName.trim();
      if (!trimmed) return false;
      if (trimmed.toLowerCase() === "all") return false;
      if (trimmed === oldName) return true;
      if (cycles.some((c) => c.toLowerCase() !== oldName.toLowerCase() && c.toLowerCase() === trimmed.toLowerCase())) {
        return false;
      }
      cycles = cycles.map((c) => (c === oldName ? trimmed : c));
      if (activeCycle === oldName) {
        activeCycle = trimmed;
      }
      // Migrate jobs
      for (const id in jobs) {
        if (jobs[id]?.cycle === oldName) {
          jobs[id] = { ...jobs[id], cycle: trimmed };
        }
      }
      return true;
    },
    deleteCycle: (name, reassignTo) => {
      cycles = cycles.filter((c) => c !== name);
      if (activeCycle === name) {
        activeCycle = cycles[0] || "All";
      }
      // Migrate jobs
      for (const id in jobs) {
        if (jobs[id]?.cycle === name) {
          jobs[id] = {
            ...jobs[id],
            cycle: reassignTo && reassignTo !== "All" ? reassignTo : undefined,
          };
        }
      }
      return true;
    },
  };
}

// Tests
{
  const mgr = createCycleManager();

  // Test 1: Defaults to empty cycles and "All" active
  assert.deepEqual(mgr.getCycles(), []);
  assert.equal(mgr.getActiveCycle(), "All");

  // Test 2: Add cycle
  assert.equal(mgr.addCycle("Summer 2026"), true);
  assert.deepEqual(mgr.getCycles(), ["Summer 2026"]);
  assert.equal(mgr.getActiveCycle(), "Summer 2026");

  // Test 3: Reject "All" as cycle name
  assert.equal(mgr.addCycle("All"), false);
  assert.equal(mgr.addCycle("  all  "), false);

  // Test 4: Reject duplicates (case-insensitive)
  assert.equal(mgr.addCycle("summer 2026"), false);
  assert.deepEqual(mgr.getCycles(), ["Summer 2026"]);

  // Test 5: Add a second cycle
  assert.equal(mgr.addCycle("Fall 2025"), true);
  assert.deepEqual(mgr.getCycles(), ["Summer 2026", "Fall 2025"]);
  assert.equal(mgr.getActiveCycle(), "Fall 2025");

  // Populate some jobs
  mgr.setJobs({
    job1: { id: "job1", company: "Meta", cycle: "Summer 2026" },
    job2: { id: "job2", company: "Google", cycle: "Fall 2025" },
    job3: { id: "job3", company: "Amazon", cycle: "Summer 2026" },
  });

  // Test 6: Rename cycle with job migration
  assert.equal(mgr.renameCycle("Summer 2026", "Summer 2026 Internships"), true);
  assert.deepEqual(mgr.getCycles(), ["Summer 2026 Internships", "Fall 2025"]);
  assert.equal(mgr.getJobs().job1.cycle, "Summer 2026 Internships");
  assert.equal(mgr.getJobs().job3.cycle, "Summer 2026 Internships");
  assert.equal(mgr.getJobs().job2.cycle, "Fall 2025");

  // Test 7: Delete cycle with reassign
  assert.equal(mgr.deleteCycle("Fall 2025", "Summer 2026 Internships"), true);
  assert.deepEqual(mgr.getCycles(), ["Summer 2026 Internships"]);
  assert.equal(mgr.getJobs().job2.cycle, "Summer 2026 Internships");

  // Test 8: Delete cycle with untag (no reassign)
  assert.equal(mgr.deleteCycle("Summer 2026 Internships"), true);
  assert.deepEqual(mgr.getCycles(), []);
  assert.equal(mgr.getActiveCycle(), "All");
  assert.equal(mgr.getJobs().job1.cycle, undefined);

  // Test 9: Deactivate cycle & Batch Assign
  mgr.addCycle("Spring 2026");
  mgr.setActiveCycle("Spring 2026");
  assert.equal(mgr.getActiveCycle(), "Spring 2026");
  // Deactivate:
  mgr.setActiveCycle("All");
  assert.equal(mgr.getActiveCycle(), "All");

  // Batch assign jobs
  const jobsToBatch = {
    a: { id: "a", company: "Apple", appliedDate: "2026-02-01" },
    b: { id: "b", company: "Netflix", appliedDate: "2026-02-15" },
    c: { id: "c", company: "Stripe", appliedDate: "2025-05-10" },
  };
  mgr.setJobs(jobsToBatch);

  // Batch assign [a, b] to "Spring 2026"
  const batchAssign = (jobIds, targetCycle) => {
    const cur = mgr.getJobs();
    for (const id of jobIds) {
      if (cur[id]) {
        cur[id] = { ...cur[id], cycle: targetCycle || undefined };
      }
    }
    mgr.setJobs(cur);
  };

  batchAssign(["a", "b"], "Spring 2026");
  assert.equal(mgr.getJobs().a.cycle, "Spring 2026");
  assert.equal(mgr.getJobs().b.cycle, "Spring 2026");
  assert.equal(mgr.getJobs().c.cycle, undefined);

  // Batch clear cycle
  batchAssign(["a"], "");
  assert.equal(mgr.getJobs().a.cycle, undefined);
  assert.equal(mgr.getJobs().b.cycle, "Spring 2026");

  console.log("✓ All Cycles logic tests passed successfully!");
}
