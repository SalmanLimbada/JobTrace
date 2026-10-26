"use client";

import { useState, useEffect, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";

const SUPPORT_EMAIL = "support@jobtrace.app";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const { user } = useAuth();

  const [topic, setTopic] = useState("Feedback & Suggestions");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail(user?.email || "");
      setMessage("");
      setTopic("Feedback & Suggestions");
      setIsSubmitted(false);
      setCopied(false);
    }
  }, [isOpen, user?.email]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    const subject = `[JobTrace ${topic}] from ${email || "User"}`;
    const body = `Category: ${topic}\nFrom: ${email || "Anonymous"}\n\nMessage:\n${message.trim()}`;

    // 1. Attempt opening native mail client
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    try {
      window.open(mailtoUrl, "_blank");
    } catch {
      // fallback
    }

    // 2. Also copy to clipboard so message is never lost if mailto fails
    try {
      navigator.clipboard.writeText(body);
      setCopied(true);
    } catch {
      // ignore
    }

    setIsSubmitted(true);
  }

  const handleManualCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `To: ${SUPPORT_EMAIL}\nSubject: [JobTrace ${topic}]\n\n${message.trim()}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-[#30363d] bg-[#161b22] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-[#58a6ff]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <h2 className="text-sm font-semibold text-[#f0f6fc]">
              Contact Us & Feedback
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#f0f6fc] p-1.5 rounded-md text-xs transition-colors cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {isSubmitted ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-[#2ea043]/20 border border-[#2ea043]/40 flex items-center justify-center text-[#3fb950]">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#f0f6fc]">
                  Message Prepared!
                </h3>
                <p className="text-xs text-[#8b949e] mt-1.5 max-w-xs mx-auto leading-relaxed">
                  We opened your default email client to send to{" "}
                  <span className="text-[#58a6ff] font-mono font-medium">
                    {SUPPORT_EMAIL}
                  </span>
                  .
                </p>
                {copied && (
                  <p className="text-[11px] text-[#3fb950] mt-1">
                    ✓ Message was also copied to your clipboard.
                  </p>
                )}
              </div>

              <div className="pt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleManualCopy}
                  className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] text-xs font-medium transition-colors cursor-pointer"
                >
                  {copied ? "Copied!" : "Copy Details"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#c9d1d9] mb-1">
                  Topic
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] text-xs rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] transition-colors cursor-pointer"
                >
                  <option value="Feedback & Suggestions">
                    Feedback & Suggestions
                  </option>
                  <option value="Bug Report">Bug Report</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="General Question">General Question</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#c9d1d9] mb-1">
                  Your Email <span className="text-[#8b949e] font-normal">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@domain.com (optional)"
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] text-xs rounded-lg px-3 py-2 outline-none focus:border-[#58a6ff] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#c9d1d9] mb-1">
                  Message *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share your thoughts, suggestions, or describe an issue you encountered..."
                  required
                  rows={4}
                  className="w-full min-h-[90px] max-h-[260px] bg-[#0d1117] border border-[#30363d] text-[#f0f6fc] placeholder-[#8b949e] text-xs rounded-lg p-3 outline-none focus:border-[#58a6ff] transition-colors resize-y"
                />
              </div>

              <div className="pt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium text-[#c9d1d9] hover:bg-[#21262d] rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!message.trim()}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    !message.trim()
                      ? "bg-[#21262d] text-[#8b949e] opacity-60 cursor-not-allowed"
                      : "bg-[#238636] hover:bg-[#2ea043] text-white shadow-sm"
                  }`}
                >
                  Send Message
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
