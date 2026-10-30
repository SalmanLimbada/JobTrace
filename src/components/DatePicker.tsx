"use client";

import { useState, useRef, useEffect } from "react";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (val: string) => void;
  placeholder?: string;
  title?: string;
  className?: string;
  id?: string;
  align?: "left" | "right";
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseIso(val?: string): { year: number; month: number; day: number } | null {
  if (!val) return null;
  const parts = val.split("T")[0].split("-");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return { year: y, month: m, day: d };
}

function toIsoString(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  title = "Select date",
  className = "",
  id,
  align = "left",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = parseIso(value);
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(parsed?.month ?? today.getMonth());

  // Keep view in sync when value changes externally
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleSelectDay(day: number) {
    const formatted = toIsoString(viewYear, viewMonth, day);
    onChange(formatted);
    setIsOpen(false);
  }

  function selectToday() {
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    setViewYear(y);
    setViewMonth(m);
    onChange(toIsoString(y, m, d));
    setIsOpen(false);
  }

  // Days in viewMonth
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Click-anywhere input trigger */}
      <button
        type="button"
        id={id}
        title={title}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between text-left transition-colors cursor-pointer select-none ${className}`}
      >
        <span className={value ? "text-zinc-100 font-mono" : "text-zinc-500"}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setIsOpen(false);
              }}
              title="Clear date"
              aria-label="Clear date"
              className="search-clear-btn w-4 h-4 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          )}
          <svg
            className="w-3.5 h-3.5 text-zinc-400 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      </button>

      {/* Sleek Custom Dark Calendar Popover */}
      {isOpen && (
        <div
          className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full mt-1.5 z-50 w-[260px] max-w-[calc(100vw-24px)] bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-100 font-sans select-none`}
        >
          {/* Calendar Header: Month + Year + Navigation */}
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-[#30363d]/70">
            <span className="text-xs font-semibold text-[#f0f6fc]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                title="Previous month"
                className="w-6 h-6 flex items-center justify-center text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-md transition-colors cursor-pointer"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={nextMonth}
                title="Next month"
                className="w-6 h-6 flex items-center justify-center text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-md transition-colors cursor-pointer"
              >
                ›
              </button>
            </div>
          </div>

          {/* Day of Week Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAY_LABELS.map((d) => (
              <span key={d} className="text-[10px] font-medium text-[#8b949e]">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Prev month padded days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const prevDay = daysInPrevMonth - firstDayOfWeek + i + 1;
              return (
                <span
                  key={`prev-${i}`}
                  className="w-7 h-7 flex items-center justify-center text-[11px] text-[#484f58] font-mono pointer-events-none"
                >
                  {prevDay}
                </span>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                parsed?.year === viewYear &&
                parsed?.month === viewMonth &&
                parsed?.day === day;
              const isToday =
                today.getFullYear() === viewYear &&
                today.getMonth() === viewMonth &&
                today.getDate() === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`w-7 h-7 rounded-md text-[11px] font-mono flex items-center justify-center transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#58a6ff] text-white font-bold shadow-xs"
                      : isToday
                      ? "text-[#58a6ff] font-semibold hover:bg-[#21262d] border border-[#58a6ff]/40"
                      : "text-[#c9d1d9] hover:bg-[#21262d] hover:text-[#f0f6fc]"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer: Quick Actions */}
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#30363d]/70 text-[11px]">
            <button
              type="button"
              onClick={selectToday}
              className="text-[#58a6ff] hover:underline font-medium cursor-pointer"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="text-[#8b949e] hover:text-[#f85149] cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
