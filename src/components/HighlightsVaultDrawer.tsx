"use client";

import { useState, useEffect, useRef } from "react";
import type { JobApplication, JobHighlights, InterviewRoundNotes } from "@/types/job";

interface HighlightsVaultDrawerProps {
  job: JobApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (jobId: string, highlights: JobHighlights) => void;
}

const DEFAULT_ROUNDS = [
  "Initial Recruiter Screen",
  "Technical / Coding Assessment",
  "System Architecture / Design",
  "Hiring Manager / Team Fit",
  "Final Round",
];

export default function HighlightsVaultDrawer({
  job,
  isOpen,
  onClose,
  onSave,
}: HighlightsVaultDrawerProps) {
  const [highlights, setHighlights] = useState<JobHighlights>({
    requirements: [],
    techStack: [],
    interviewNotes: [],
  });

  const [reqInput, setReqInput] = useState("");
  const [techInput, setTechInput] = useState("");
  const [activeRoundIndex, setActiveRoundIndex] = useState(0);
  const [roundBulletInput, setRoundBulletInput] = useState("");
  const [newRoundTitle, setNewRoundTitle] = useState("");
  const [isAddingRound, setIsAddingRound] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");

  const drawerRef = useRef<HTMLDivElement>(null);

  // Sync internal state when opened or job changes
  useEffect(() => {
    if (job) {
      const initial: JobHighlights = job.highlights || {
        requirements: [],
        techStack: [],
        interviewNotes: [
          {
            id: crypto.randomUUID(),
            round: "Technical Screen",
            bullets: [],
          },
        ],
      };
      setHighlights(initial);
      setActiveRoundIndex(0);
      setSaveStatus("saved");
    }
  }, [job]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !job) return null;

  const updateHighlights = (next: JobHighlights) => {
    setHighlights(next);
    setSaveStatus("saving");
    onSave(job.id, next);
    setTimeout(() => setSaveStatus("saved"), 350);
  };

  // --- Requirements Bullet Handlers ---
  const handleAddRequirement = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Smart splitter: if user pasted multiple lines, split them into clean bullets
    const lines = trimmed
      .split(/\r?\n/)
      .map((l) => l.replace(/^(\s*[-*•–—]+\s*|\s*\d+[\.\)]\s*)/, "").trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const next: JobHighlights = {
      ...highlights,
      requirements: [...highlights.requirements, ...lines],
    };
    updateHighlights(next);
    setReqInput("");
  };

  const handleRemoveRequirement = (idx: number) => {
    const next: JobHighlights = {
      ...highlights,
      requirements: highlights.requirements.filter((_, i) => i !== idx),
    };
    updateHighlights(next);
  };

  // --- Tech Stack Tags Handlers ---
  const handleAddTech = (text: string) => {
    const tags = text
      .split(/[,;\n]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !highlights.techStack.includes(t));

    if (tags.length === 0) return;

    const next: JobHighlights = {
      ...highlights,
      techStack: [...highlights.techStack, ...tags],
    };
    updateHighlights(next);
    setTechInput("");
  };

  const handleRemoveTech = (tagToRemove: string) => {
    const next: JobHighlights = {
      ...highlights,
      techStack: highlights.techStack.filter((t) => t !== tagToRemove),
    };
    updateHighlights(next);
  };

  // --- Interview Round Bullet Handlers ---
  const activeRound = highlights.interviewNotes[activeRoundIndex] || highlights.interviewNotes[0];

  const handleAddRoundBullet = (text: string) => {
    if (!activeRound) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    const lines = trimmed
      .split(/\r?\n/)
      .map((l) => l.replace(/^(\s*[-*•–—]+\s*|\s*\d+[\.\)]\s*)/, "").trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const updatedRounds = highlights.interviewNotes.map((r, i) => {
      if (i === activeRoundIndex) {
        return {
          ...r,
          bullets: [...r.bullets, ...lines],
        };
      }
      return r;
    });

    const next: JobHighlights = {
      ...highlights,
      interviewNotes: updatedRounds,
    };
    updateHighlights(next);
    setRoundBulletInput("");
  };

  const handleRemoveRoundBullet = (bulletIdx: number) => {
    if (!activeRound) return;
    const updatedRounds = highlights.interviewNotes.map((r, i) => {
      if (i === activeRoundIndex) {
        return {
          ...r,
          bullets: r.bullets.filter((_, bi) => bi !== bulletIdx),
        };
      }
      return r;
    });

    const next: JobHighlights = {
      ...highlights,
      interviewNotes: updatedRounds,
    };
    updateHighlights(next);
  };

  const handleCreateRound = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const newRound: InterviewRoundNotes = {
      id: crypto.randomUUID(),
      round: trimmed,
      bullets: [],
    };

    const next: JobHighlights = {
      ...highlights,
      interviewNotes: [...highlights.interviewNotes, newRound],
    };
    updateHighlights(next);
    setActiveRoundIndex(highlights.interviewNotes.length);
    setNewRoundTitle("");
    setIsAddingRound(false);
  };

  const handleDeleteRound = (idx: number) => {
    if (highlights.interviewNotes.length <= 1) {
      // Keep at least one round
      const next: JobHighlights = {
        ...highlights,
        interviewNotes: [{ id: crypto.randomUUID(), round: "Screening", bullets: [] }],
      };
      updateHighlights(next);
      setActiveRoundIndex(0);
      return;
    }

    const updated = highlights.interviewNotes.filter((_, i) => i !== idx);
    const next: JobHighlights = {
      ...highlights,
      interviewNotes: updated,
    };
    updateHighlights(next);
    setActiveRoundIndex(Math.max(0, idx - 1));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-full sm:max-w-xl bg-[#0d1117] border-l border-[#30363d] shadow-2xl flex flex-col h-full transform transition-transform"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#30363d] bg-[#161b22] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
                ⚡
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-[#f0f6fc] truncate">
                    Key Highlights Vault
                  </h2>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                    Interview Prep
                  </span>
                </div>
                <p className="text-xs text-[#8b949e] truncate">
                  <strong className="text-[#c9d1d9] font-medium">{job.role}</strong> at{" "}
                  <strong className="text-[#c9d1d9] font-medium">{job.company}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#3fb950] font-mono hidden sm:inline-flex items-center gap-1">
                {saveStatus === "saving" ? (
                  <span className="text-[#8b949e]">Saving...</span>
                ) : (
                  <span>✓ Saved</span>
                )}
              </span>

              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-md transition-colors cursor-pointer"
                aria-label="Close Highlights Vault"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body: Scrollable Vault Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
            {/* Quick Banner: Zero walls of text */}
            <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-[#c9d1d9] flex items-start gap-2.5">
              <span className="text-amber-400 shrink-0 mt-0.5">💡</span>
              <p className="leading-relaxed">
                <strong className="text-[#f0f6fc]">Strictly Bullet Points:</strong> Keep key
                takeaways punchy and scannable for instant review right before rounds. Zero raw HR
                walls of text.
              </p>
            </div>

            {/* SECTION 1: Core Requirements & Qualifications */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🎯</span>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#f0f6fc]">
                    Core Requirements & Qualifications
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-[#8b949e]">
                  {highlights.requirements.length} bullets
                </span>
              </div>

              {/* Requirement Bullets List */}
              <div className="space-y-2">
                {highlights.requirements.length === 0 ? (
                  <div className="p-3 rounded-lg border border-dashed border-[#30363d] bg-[#161b22]/50 text-center text-xs text-[#8b949e]">
                    No requirements extracted yet. Paste requirements below (auto-converts to crisp
                    bullets).
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {highlights.requirements.map((req, idx) => (
                      <li
                        key={idx}
                        className="group flex items-start justify-between gap-2.5 p-2 rounded-md bg-[#161b22] border border-[#30363d]/70 text-xs text-[#c9d1d9] hover:border-[#58a6ff]/40 transition-colors"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-[#58a6ff] shrink-0 mt-0.5 font-bold">•</span>
                          <span className="break-words leading-relaxed">{req}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRequirement(idx)}
                          title="Remove bullet"
                          className="text-[#8b949e] hover:text-[#f85149] p-0.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Add requirement input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add core qualification or paste multiple requirements..."
                    value={reqInput}
                    onChange={(e) => setReqInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddRequirement(reqInput);
                      }
                    }}
                    className="flex-1 bg-[#161b22] border border-[#30363d] text-xs text-[#f0f6fc] placeholder-[#8b949e] rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff]"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddRequirement(reqInput)}
                    disabled={!reqInput.trim()}
                    className="px-3 py-2 text-xs font-medium bg-[#21262d] hover:bg-[#30363d] disabled:opacity-40 text-[#c9d1d9] border border-[#30363d] rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </section>

            {/* SECTION 2: Tech Stack & Tools */}
            <section className="space-y-3 pt-2 border-t border-[#30363d]/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🛠️</span>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#f0f6fc]">
                    Tech Stack & Tools
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-[#8b949e]">
                  {highlights.techStack.length} tools
                </span>
              </div>

              {/* Badges / Pills list */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2.5 rounded-lg border border-[#30363d]/70 bg-[#161b22]">
                  {highlights.techStack.length === 0 ? (
                    <span className="text-xs text-[#8b949e]">
                      No tech stack tags yet. Type a technology (e.g. React, Go, Docker) and press
                      Enter.
                    </span>
                  ) : (
                    highlights.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#21262d] border border-[#388bfd]/30 text-[#58a6ff] shadow-xs"
                      >
                        <span>{tech}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTech(tech)}
                          title={`Remove ${tech}`}
                          className="hover:text-white transition-colors cursor-pointer text-[10px]"
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Add Tech Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Next.js, PostgreSQL, Docker (comma separated)..."
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        handleAddTech(techInput);
                      }
                    }}
                    className="flex-1 bg-[#161b22] border border-[#30363d] text-xs text-[#f0f6fc] placeholder-[#8b949e] rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff]"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTech(techInput)}
                    disabled={!techInput.trim()}
                    className="px-3 py-2 text-xs font-medium bg-[#21262d] hover:bg-[#30363d] disabled:opacity-40 text-[#c9d1d9] border border-[#30363d] rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    + Add Tag
                  </button>
                </div>
              </div>
            </section>

            {/* SECTION 3: Round & Interview Notes */}
            <section className="space-y-3 pt-2 border-t border-[#30363d]/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🎙️</span>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#f0f6fc]">
                    Round & Interview Notes
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-[#8b949e]">
                  {highlights.interviewNotes.length} rounds
                </span>
              </div>

              {/* Rounds Tabs Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {highlights.interviewNotes.map((roundObj, rIdx) => {
                  const isActive = rIdx === activeRoundIndex;
                  return (
                    <button
                      key={roundObj.id || rIdx}
                      type="button"
                      onClick={() => setActiveRoundIndex(rIdx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer border ${
                        isActive
                          ? "bg-[#21262d] border-[#58a6ff] text-[#f0f6fc] shadow-xs"
                          : "bg-[#161b22] border-[#30363d] text-[#8b949e] hover:border-[#8b949e]/50 hover:text-[#c9d1d9]"
                      }`}
                    >
                      <span>{roundObj.round}</span>
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded-full bg-[#0d1117] text-[#8b949e]">
                        {roundObj.bullets.length}
                      </span>
                    </button>
                  );
                })}

                {/* Button to add new round */}
                <button
                  type="button"
                  onClick={() => setIsAddingRound(true)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#58a6ff] hover:bg-[#21262d] border border-dashed border-[#58a6ff]/40 transition-colors whitespace-nowrap cursor-pointer"
                >
                  + New Round
                </button>
              </div>

              {/* Add New Round Prompt if open */}
              {isAddingRound && (
                <div className="p-3 rounded-lg border border-[#30363d] bg-[#161b22] space-y-2 animate-in fade-in duration-100">
                  <label className="block text-[11px] font-semibold text-[#8b949e] uppercase">
                    Round Name
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. System Design, Behavioral, Final..."
                      value={newRoundTitle}
                      onChange={(e) => setNewRoundTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateRound(newRoundTitle);
                        }
                      }}
                      className="flex-1 bg-[#0d1117] border border-[#30363d] text-xs text-[#f0f6fc] placeholder-[#8b949e] rounded px-2.5 py-1.5 outline-none focus:border-[#58a6ff]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateRound(newRoundTitle)}
                      disabled={!newRoundTitle.trim()}
                      className="px-3 py-1.5 text-xs font-medium bg-[#238636] hover:bg-[#2ea043] disabled:opacity-40 text-white rounded transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingRound(false);
                        setNewRoundTitle("");
                      }}
                      className="px-2.5 py-1.5 text-xs text-[#8b949e] hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Quick round suggestions */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {DEFAULT_ROUNDS.filter(
                      (preset) => !highlights.interviewNotes.some((r) => r.round === preset)
                    ).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleCreateRound(preset)}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#30363d] transition-colors cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Round Card & Bullet Points */}
              {activeRound && (
                <div className="p-3.5 rounded-xl border border-[#30363d] bg-[#161b22] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#30363d]/60">
                    <div>
                      <h4 className="text-xs font-semibold text-[#f0f6fc] flex items-center gap-1.5">
                        <span>🎯</span>
                        <span>{activeRound.round}</span>
                      </h4>
                      <p className="text-[11px] text-[#8b949e]">
                        Interview talking points, expected questions, and interview takeaways
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteRound(activeRoundIndex)}
                      title="Delete this round"
                      className="text-[11px] text-[#8b949e] hover:text-[#f85149] px-2 py-1 rounded hover:bg-[#21262d] transition-colors cursor-pointer"
                    >
                      Delete Round
                    </button>
                  </div>

                  {/* Bullet list for this round */}
                  <div className="space-y-1.5">
                    {activeRound.bullets.length === 0 ? (
                      <div className="p-3 text-center text-xs text-[#8b949e] italic border border-dashed border-[#30363d] rounded-lg">
                        No round bullets recorded yet. Add interview cues, common questions, or
                        insights below.
                      </div>
                    ) : (
                      activeRound.bullets.map((bullet, bIdx) => (
                        <div
                          key={bIdx}
                          className="group flex items-start justify-between gap-2 p-2 rounded-md bg-[#0d1117] border border-[#30363d]/60 text-xs text-[#c9d1d9] hover:border-[#58a6ff]/40 transition-colors"
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-[#3fb950] font-bold shrink-0 mt-0.5">•</span>
                            <span className="break-words leading-relaxed">{bullet}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveRoundBullet(bIdx)}
                            title="Delete note"
                            className="text-[#8b949e] hover:text-[#f85149] p-0.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Bullet Input for this round */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add bullet note or interview question..."
                      value={roundBulletInput}
                      onChange={(e) => setRoundBulletInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddRoundBullet(roundBulletInput);
                        }
                      }}
                      className="flex-1 bg-[#0d1117] border border-[#30363d] text-xs text-[#f0f6fc] placeholder-[#8b949e] rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddRoundBullet(roundBulletInput)}
                      disabled={!roundBulletInput.trim()}
                      className="px-3 py-2 text-xs font-medium bg-[#21262d] hover:bg-[#30363d] disabled:opacity-40 text-[#c9d1d9] border border-[#30363d] rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      + Bullet
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[#30363d] bg-[#161b22] flex items-center justify-between shrink-0">
            <span className="text-[11px] text-[#8b949e]">
              Changes auto-sync to your account & dashboard
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-[#c9d1d9] hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
