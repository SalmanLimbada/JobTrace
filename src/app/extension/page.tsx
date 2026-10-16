"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function ExtensionPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex flex-col font-sans">
      <Navbar />

      <main className="p-4 sm:p-8 max-w-5xl mx-auto w-full flex-1 space-y-6">
        {/* Header - Consistent with Tracker and Settings */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f0f6fc]">
            Extension
          </h1>
          <p className="text-xs text-[#8b949e] mt-0.5">
            Capture job applications directly from any page in your browser
          </p>
        </div>

        {/* Download Package */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
            Download Extension
          </h2>

          <div className="border border-[#30363d] bg-[#161b22] rounded-lg p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-sm font-semibold text-[#f0f6fc] block">
                JobTrace Extension Package (Manifest V3)
              </span>
              <p className="text-xs text-[#8b949e]">
                Pre-packaged ZIP ready for unpacked loading in Chromium browsers (Chrome, Brave, Edge).
              </p>
            </div>

            <a
              href="/jobtrace-extension.zip"
              download="jobtrace-extension.zip"
              className="px-4 py-2 text-xs font-medium bg-[#238636] hover:bg-[#2ea043] text-white rounded-md transition-colors shrink-0 flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download ZIP
            </a>
          </div>
        </section>

        {/* Installation Instructions */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
            How to Install (Developer Mode)
          </h2>

          <div className="border border-[#30363d] bg-[#161b22] rounded-lg divide-y divide-[#30363d] text-xs">
            <div className="p-4 sm:p-5 flex gap-4 items-start">
              <span className="w-6 h-6 rounded bg-[#21262d] text-[#58a6ff] border border-[#30363d] text-xs font-mono font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <div className="space-y-1.5 flex-1">
                <span className="text-xs font-semibold text-[#f0f6fc] block">
                  Extract or Locate the Folder
                </span>
                <p className="text-xs text-[#8b949e]">
                  Unzip the downloaded package or use the existing <code className="font-mono text-xs bg-[#0d1117] px-1.5 py-0.5 rounded border border-[#30363d] text-[#c9d1d9]">extension/</code> directory in this repository.
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 flex gap-4 items-start">
              <span className="w-6 h-6 rounded bg-[#21262d] text-[#58a6ff] border border-[#30363d] text-xs font-mono font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <div className="space-y-1.5 flex-1">
                <span className="text-xs font-semibold text-[#f0f6fc] block">
                  Open Chrome Extension Management
                </span>
                <p className="text-xs text-[#8b949e]">
                  Navigate to <code className="font-mono text-xs bg-[#0d1117] px-1.5 py-0.5 rounded border border-[#30363d] text-[#58a6ff] select-all">chrome://extensions</code> and turn on <strong className="text-[#f0f6fc]">Developer mode</strong> in the top right.
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 flex gap-4 items-start">
              <span className="w-6 h-6 rounded bg-[#21262d] text-[#58a6ff] border border-[#30363d] text-xs font-mono font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <div className="space-y-1.5 flex-1">
                <span className="text-xs font-semibold text-[#f0f6fc] block">
                  Load Unpacked
                </span>
                <p className="text-xs text-[#8b949e]">
                  Click <strong className="text-[#f0f6fc]">Load unpacked</strong> and select the extension directory. The JobTrace icon will appear in your browser toolbar.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
              How It Works
            </h2>
            <Link
              href="/settings"
              className="text-xs text-[#58a6ff] hover:underline font-medium"
            >
              Configure in Settings →
            </Link>
          </div>

          <div className="border border-[#30363d] bg-[#161b22] rounded-lg divide-y divide-[#30363d] text-xs">
            <div className="p-4 flex gap-3">
              <span className="font-mono text-[#58a6ff] font-bold">01</span>
              <div>
                <p className="font-medium text-[#f0f6fc]">Open on any job posting</p>
                <p className="text-[#8b949e] mt-0.5">
                  Click the extension icon on any job board, career portal, or posting page.
                </p>
              </div>
            </div>

            <div className="p-4 flex gap-3">
              <span className="font-mono text-[#58a6ff] font-bold">02</span>
              <div>
                <p className="font-medium text-[#f0f6fc]">Click Capture</p>
                <p className="text-[#8b949e] mt-0.5">
                  Scrapes the configured fields (company, role, salary, location, posting URL, and core requirements).
                </p>
              </div>
            </div>

            <div className="p-4 flex gap-3">
              <span className="font-mono text-[#58a6ff] font-bold">03</span>
              <div>
                <p className="font-medium text-[#f0f6fc]">Review & Save</p>
                <p className="text-[#8b949e] mt-0.5">
                  Review extracted fields and save directly to your tracker in one click.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
