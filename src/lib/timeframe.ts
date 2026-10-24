import { getLocalDateString } from "./jobId";

export type TimeframePreset = "all" | "7d" | "30d" | "90d" | "year" | "custom";

export interface TimeframeFilter {
  preset: TimeframePreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export interface TimeframeBounds {
  start?: string;
  end?: string;
  label: string;
}

export function getTimeframeBounds(
  timeframe: TimeframeFilter,
  referenceDate: Date = new Date()
): TimeframeBounds | null {
  if (timeframe.preset === "all") {
    return null;
  }

  const todayStr = getLocalDateString(referenceDate);

  if (timeframe.preset === "7d") {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - 7);
    const start = getLocalDateString(d);
    return { start, label: "Past 7 Days" };
  }

  if (timeframe.preset === "30d") {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - 30);
    const start = getLocalDateString(d);
    return { start, label: "Past 30 Days" };
  }

  if (timeframe.preset === "90d") {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - 90);
    const start = getLocalDateString(d);
    return { start, label: "Past 90 Days" };
  }

  if (timeframe.preset === "year") {
    const start = `${referenceDate.getFullYear()}-01-01`;
    return { start, label: `Year ${referenceDate.getFullYear()}` };
  }

  if (timeframe.preset === "custom") {
    let label = "Custom Range";
    if (timeframe.startDate && timeframe.endDate) {
      label = `${timeframe.startDate} to ${timeframe.endDate}`;
    } else if (timeframe.startDate) {
      label = `Since ${timeframe.startDate}`;
    } else if (timeframe.endDate) {
      label = `Until ${timeframe.endDate}`;
    }
    return {
      start: timeframe.startDate || undefined,
      end: timeframe.endDate || undefined,
      label,
    };
  }

  return null;
}

export function isJobInTimeframe(
  appliedDate: string | undefined,
  timeframe: TimeframeFilter,
  referenceDate: Date = new Date()
): boolean {
  if (timeframe.preset === "all") return true;

  const jobDate = (appliedDate || "").split("T")[0].trim();
  if (!jobDate) return false;

  const bounds = getTimeframeBounds(timeframe, referenceDate);
  if (!bounds) return true;

  if (bounds.start && jobDate < bounds.start) return false;
  if (bounds.end && jobDate > bounds.end) return false;

  return true;
}
