"use client";

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import type { JobApplication, ApplicationStatus } from "@/types/job";
import {
  parseApplicationsFromCSV,
  parseApplicationsFromExcel,
  type CSVParseResult,
} from "@/lib/csv";

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (jobs: Record<string, JobApplication>, count: number) => void;
}

export default function CSVImportModal({
  isOpen,
  onClose,
  onImport,
}: CSVImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setParseResult(null);
      setErrorMsg(null);
      setIsDragging(false);
      setIsImporting(false);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function processFile(selectedFile: File) {
    setErrorMsg(null);
    const name = selectedFile.name.toLowerCase();
    const isXlsx = name.endsWith(".xlsx");
    const isCsvOrTsv =
      name.endsWith(".csv") ||
      name.endsWith(".tsv") ||
      selectedFile.type === "text/csv" ||
      selectedFile.type === "text/tab-separated-values";

    if (!isXlsx && !isCsvOrTsv) {
      setErrorMsg("Please upload a valid .csv, .tsv, or Excel (.xlsx) file.");
      return;
    }

    try {
      let result: CSVParseResult;
      if (isXlsx) {
        result = await parseApplicationsFromExcel(selectedFile);
      } else {
        const text = await selectedFile.text();
        result = parseApplicationsFromCSV(text);
      }
      setFile(selectedFile);
      setParseResult(result);
    } catch (err: unknown) {
      setFile(null);
      setParseResult(null);
      const msg = err instanceof Error ? err.message : "Failed to parse file.";
      setErrorMsg(msg);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
    // reset input so the same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  }

  function handleConfirmImport() {
    if (!parseResult || parseResult.count === 0) return;
    setIsImporting(true);
    try {
      onImport(parseResult.jobs, parseResult.count);
      onClose();
    } finally {
      setIsImporting(false);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getStatusBadgeClass(status: ApplicationStatus): string {
    switch (status) {
      case "Applied":
        return "bg-[#58a6ff]/10 text-[#58a6ff] border-[#58a6ff]/30";
      case "Interview":
        return "bg-[#d29922]/10 text-[#d29922] border-[#d29922]/30";
      case "Offer":
        return "bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/30";
      case "Rejected":
        return "bg-[#f85149]/10 text-[#f85149] border-[#f85149]/30";
      default:
        return "bg-[#8b949e]/10 text-[#8b949e] border-[#8b949e]/30";
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-xl border border-[#30363d] bg-[#161b22] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d]">
          <div className="flex items-center gap-2.5">
            <svg
              className="w-5 h-5 text-[#58a6ff]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            <div>
              <h2 className="text-sm font-semibold text-[#f0f6fc]">
                Import Applications
              </h2>
              <p className="text-xs text-[#8b949e]">
                Upload from Google Sheets, Excel (.xlsx), or CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#f0f6fc] p-1.5 rounded-md text-xs transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="rounded-md bg-[#f85149]/10 border border-[#f85149]/30 px-3.5 py-2.5 text-xs text-[#f85149] flex items-start gap-2">
              <span className="font-bold">Error:</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {!parseResult ? (
            /* Dropzone */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? "border-[#58a6ff] bg-[#58a6ff]/10"
                  : "border-[#30363d] bg-[#0d1117] hover:border-[#8b949e] hover:bg-[#161b22]"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#58a6ff]">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>

              <div>
                <p className="text-sm font-medium text-[#f0f6fc]">
                  Drop your CSV or Excel (.xlsx) file here, or{" "}
                  <span className="text-[#58a6ff] hover:underline">browse</span>
                </p>
                <p className="text-xs text-[#8b949e] mt-1">
                  Supports .csv, .tsv, and .xlsx with headers like Company, Role, Status, Date
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            /* Parsed File Preview State */
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="flex items-center justify-between bg-[#0d1117] border border-[#30363d] px-4 py-3 rounded-lg text-xs">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span className="px-2 py-0.5 rounded bg-[#21262d] text-[#58a6ff] font-mono text-[11px] font-semibold">
                    {file?.name.toLowerCase().endsWith(".xlsx")
                      ? "XLSX"
                      : file?.name.toLowerCase().endsWith(".tsv")
                      ? "TSV"
                      : "CSV"}
                  </span>
                  <span className="font-medium text-[#f0f6fc] truncate max-w-xs">
                    {file?.name}
                  </span>
                  <span className="text-[#8b949e]">
                    ({file ? formatFileSize(file.size) : ""})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setParseResult(null);
                    setErrorMsg(null);
                  }}
                  className="text-xs text-[#8b949e] hover:text-[#f85149] transition-colors"
                >
                  Change file
                </button>
              </div>

              {/* Stats & Column Auto-Detection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-[#0d1117] border border-[#30363d] p-3 rounded-lg">
                  <span className="text-[#8b949e] block mb-1">Applications Found</span>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-[#3fb950]">
                      {parseResult.count}
                    </span>
                    <span className="text-[#8b949e]">ready to import</span>
                    {parseResult.skippedCount > 0 && (
                      <span className="text-[#d29922] text-[11px] ml-auto">
                        ({parseResult.skippedCount} empty row{parseResult.skippedCount === 1 ? "" : "s"} skipped)
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] p-3 rounded-lg">
                  <span className="text-[#8b949e] block mb-1">Detected Columns</span>
                  <div className="flex flex-wrap gap-1 text-[11px]">
                    <span className="bg-[#21262d] text-[#c9d1d9] px-2 py-0.5 rounded border border-[#30363d]">
                      Company: <strong className="text-[#f0f6fc]">{parseResult.detectedMapping.companyCol}</strong>
                    </span>
                    <span className="bg-[#21262d] text-[#c9d1d9] px-2 py-0.5 rounded border border-[#30363d]">
                      Role: <strong className="text-[#f0f6fc]">{parseResult.detectedMapping.roleCol}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Preview Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#c9d1d9]">
                    Data Preview (first {Math.min(parseResult.rows.length, 5)} rows)
                  </span>
                  <span className="text-[11px] text-[#8b949e]">
                    Showing sample rows
                  </span>
                </div>

                <div className="border border-[#30363d] rounded-lg overflow-x-auto bg-[#0d1117]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#161b22] text-[#8b949e] border-b border-[#30363d]">
                      <tr>
                        <th className="px-3 py-2 font-medium">Company</th>
                        <th className="px-3 py-2 font-medium">Role</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30363d]/50">
                      {parseResult.rows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#161b22]/50">
                          <td className="px-3 py-2 text-[#f0f6fc] font-medium max-w-[140px] truncate">
                            {row.company}
                          </td>
                          <td className="px-3 py-2 text-[#c9d1d9] max-w-[140px] truncate">
                            {row.role}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full border ${getStatusBadgeClass(
                                row.status
                              )}`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[#8b949e] font-mono text-[11px]">
                            {row.appliedDate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[#30363d] bg-[#161b22]">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-[#c9d1d9] hover:text-[#f0f6fc] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] px-3.5 py-2 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!parseResult || parseResult.count === 0 || isImporting}
            onClick={handleConfirmImport}
            className={`text-xs font-medium px-4 py-2 rounded-md transition-colors flex items-center gap-1.5 ${
              !parseResult || parseResult.count === 0 || isImporting
                ? "bg-[#238636]/50 text-white/50 cursor-not-allowed"
                : "bg-[#238636] hover:bg-[#2ea043] text-white cursor-pointer shadow-sm"
            }`}
          >
            {isImporting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Importing...
              </>
            ) : (
              `Import ${parseResult ? parseResult.count : ""} Application${
                parseResult?.count === 1 ? "" : "s"
              }`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
