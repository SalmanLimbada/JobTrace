"use client";

import { useState, useRef, useEffect } from "react";
import type { TimeframeFilter, TimeframePreset } from "@/lib/timeframe";
import DatePicker from "@/components/DatePicker";

interface TimeframeFilterProps {
  value: TimeframeFilter;
  onChange: (value: TimeframeFilter) => void;
  totalCount: number;
  filteredCount: number;
}

const PRESETS: { key: TimeframePreset; label: string }[] = [
  { key: "all", label: "All Time" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom" },
];

export default function TimeframeFilterBar({
  value,
  onChange,
  totalCount,
  filteredCount,
}: TimeframeFilterProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(value.preset === "custom");
  const customRef = useRef<HTMLDivElement>(null);

  // Sync custom open state if preset changes externally
  useEffect(() => {
    if (value.preset === "custom") {
      setIsCustomOpen(true);
    } else {
      setIsCustomOpen(false);
    }
  }, [value.preset]);

  function handleSelectPreset(preset: TimeframePreset) {
    if (preset === "custom") {
      setIsCustomOpen(true);
      onChange({ ...value, preset: "custom" });
    } else {
      setIsCustomOpen(false);
      onChange({ preset, startDate: undefined, endDate: undefined });
    }
  }

  function handleStartDateChange(dateStr: string) {
    onChange({
      ...value,
      preset: "custom",
      startDate: dateStr,
    });
  }

  function handleEndDateChange(dateStr: string) {
    onChange({
      ...value,
      preset: "custom",
      endDate: dateStr,
    });
  }

  function handleReset() {
    setIsCustomOpen(false);
    onChange({ preset: "all" });
  }

  const isFiltered = value.preset !== "all";

  return (
    <div className="flex flex-col items-start md:items-end gap-2">
      <div className="flex flex-wrap items-center gap-1.5 bg-[#161b22] border border-[#30363d] p-1 rounded-lg">
        {PRESETS.map((p) => {
          const isActive = value.preset === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => handleSelectPreset(p.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer select-none ${
                isActive
                  ? "bg-[#21262d] text-[#58a6ff] border border-[#58a6ff]/40 shadow-sm"
                  : "text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]/50 border border-transparent"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Range Popdown / Expandable Controls */}
      {isCustomOpen && (
        <div
          ref={customRef}
          className="flex flex-wrap items-center gap-2 bg-[#161b22] border border-[#30363d] p-2.5 rounded-lg text-xs animate-in fade-in duration-150 w-full md:w-auto"
        >
          <div className="flex items-center gap-1.5 min-w-[130px]">
            <span className="text-[#8b949e] text-[11px] font-medium shrink-0">From:</span>
            <DatePicker
              value={value.startDate || ""}
              onChange={handleStartDateChange}
              placeholder="YYYY-MM-DD"
              className="bg-[#0d1117] border border-[#30363d] text-xs rounded-md px-2 py-1 outline-none text-[#c9d1d9] focus:border-[#58a6ff] font-mono h-[30px]"
            />
          </div>
          <div className="flex items-center gap-1.5 min-w-[130px]">
            <span className="text-[#8b949e] text-[11px] font-medium shrink-0">To:</span>
            <DatePicker
              value={value.endDate || ""}
              onChange={handleEndDateChange}
              placeholder="YYYY-MM-DD"
              className="bg-[#0d1117] border border-[#30363d] text-xs rounded-md px-2 py-1 outline-none text-[#c9d1d9] focus:border-[#58a6ff] font-mono h-[30px]"
            />
          </div>
          {(value.startDate || value.endDate) && (
            <button
              type="button"
              onClick={() => onChange({ preset: "custom", startDate: undefined, endDate: undefined })}
              className="text-[#8b949e] hover:text-[#f85149] text-[11px] px-1.5 py-1 transition-colors cursor-pointer"
              title="Clear custom dates"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Filter Status Summary Badge */}
      {isFiltered && (
        <div className="flex items-center gap-2 text-[11px] text-[#8b949e]">
          <span>
            Showing <strong className="text-[#f0f6fc] font-medium">{filteredCount}</strong> of{" "}
            <strong className="text-[#f0f6fc] font-medium">{totalCount}</strong> applications
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="text-[#58a6ff] hover:underline cursor-pointer font-medium"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
