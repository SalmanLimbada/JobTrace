"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { CustomFieldDefinition, CustomFieldType } from "@/types/job";

export type AppTheme = "dark" | "light";

export interface StandardColumnsSettings {
  company: boolean;
  role: boolean;
  status: boolean;
  appliedDate: boolean;
  url: boolean;
  notes: boolean;
}

export const DEFAULT_STANDARD_COLUMNS: StandardColumnsSettings = {
  company: true,
  role: true,
  status: true,
  appliedDate: true,
  url: true,
  notes: true,
};

export const STANDARD_COLUMN_NAMES: Record<keyof StandardColumnsSettings, string> = {
  company: "Company",
  role: "Role",
  status: "Status",
  appliedDate: "Date Applied",
  url: "Posting URL",
  notes: "Notes",
};

export interface ShortcutSettings {
  focusSearch: string;
  addJob: string;
  openSettings: string;
}

export const DEFAULT_SHORTCUTS: ShortcutSettings = {
  focusSearch: "/",
  addJob: "n",
  openSettings: ",",
};

export const SHORTCUT_LABELS: Record<keyof ShortcutSettings, { label: string; desc: string }> = {
  focusSearch: { label: "Focus Search", desc: "Jump to search bar" },
  addJob: { label: "New Application", desc: "Focus company input in form" },
  openSettings: { label: "Open Settings", desc: "Open preferences modal" },
};

export const DEFAULT_STATUSES: string[] = ["Applied", "Interview", "Offer", "Rejected"];

export const SUGGESTED_STATUSES: string[] = [
  "Other",
  "OA / Assessment",
  "Phone Screen",
  "Technical Screen",
  "Behavioral",
  "Waitlisted",
  "Withdrawn",
];

export const SUGGESTED_FIELDS: Omit<CustomFieldDefinition, "enabled">[] = [
  { id: "salary", name: "Salary", type: "text" },
  { id: "location", name: "Location", type: "text" },
  { id: "deadlineDate", name: "Next Round / Deadline", type: "date" },
  { id: "referral", name: "Referral / Contact", type: "text" },
  { id: "techStack", name: "Tech Stack", type: "text" },
];

export const DEFAULT_FIELDS: CustomFieldDefinition[] = [
  { id: "salary", name: "Salary", type: "text", enabled: true },
  { id: "location", name: "Location", type: "text", enabled: true },
  { id: "deadlineDate", name: "Next Round / Deadline", type: "date", enabled: false },
];

export const BASE_COLUMN_ORDER = ["company", "role", "status", "appliedDate", "salary", "location", "deadlineDate", "url", "notes"];

export interface ColumnSettings {
  salary: boolean;
  location: boolean;
  deadlineDate: boolean;
  [key: string]: boolean;
}

interface SettingsContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  standardColumns: StandardColumnsSettings;
  toggleStandardColumn: (key: keyof StandardColumnsSettings) => void;
  showRowNumbers: boolean;
  setShowRowNumbers: (show: boolean) => void;
  toggleShowRowNumbers: () => void;
  customFields: CustomFieldDefinition[];
  addCustomField: (name: string, type?: CustomFieldType) => void;
  removeCustomField: (id: string) => void;
  toggleCustomField: (id: string) => void;
  statuses: string[];
  addStatus: (name: string) => void;
  removeStatus: (name: string) => void;
  moveStatus: (name: string, direction: "up" | "down") => void;
  reorderStatuses: (sourceName: string, targetName: string, side?: "above" | "below") => void;
  resetStatuses: () => void;
  columnOrder: string[];
  reorderColumns: (sourceId: string, targetId: string, side?: "left" | "right") => void;
  moveColumn: (id: string, direction: "up" | "down") => void;
  resetColumnOrder: () => void;
  shortcuts: ShortcutSettings;
  updateShortcut: (action: keyof ShortcutSettings, key: string) => void;
  resetShortcuts: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  columns: ColumnSettings;
  setColumnVisible: (column: string, visible: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_THEME_KEY = "jobtrace_theme";
const STORAGE_FIELDS_KEY = "jobtrace_custom_fields_v2";
const STORAGE_STANDARD_COLS_KEY = "jobtrace_standard_columns";
const STORAGE_ROW_NUMBERS_KEY = "jobtrace_row_numbers";
const STORAGE_COLUMN_ORDER_KEY = "jobtrace_column_order";
const STORAGE_SHORTCUTS_KEY = "jobtrace_shortcuts";
const STORAGE_STATUSES_KEY = "jobtrace_statuses_v1";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("dark");
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(DEFAULT_FIELDS);
  const [standardColumns, setStandardColumns] = useState<StandardColumnsSettings>(DEFAULT_STANDARD_COLUMNS);
  const [showRowNumbers, setShowRowNumbersState] = useState<boolean>(true);
  const [columnOrder, setColumnOrderState] = useState<string[]>(BASE_COLUMN_ORDER);
  const [shortcuts, setShortcutsState] = useState<ShortcutSettings>(DEFAULT_SHORTCUTS);
  const [statuses, setStatusesState] = useState<string[]>(DEFAULT_STATUSES);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    try {
      // Statuses
      const savedStatuses = localStorage.getItem(STORAGE_STATUSES_KEY);
      if (savedStatuses) {
        const parsed = JSON.parse(savedStatuses);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStatusesState(parsed);
        }
      }
      // Theme
      const savedTheme = localStorage.getItem(STORAGE_THEME_KEY);
      const activeTheme: AppTheme = savedTheme === "light" ? "light" : "dark";
      setThemeState(activeTheme);
      document.documentElement.setAttribute("data-theme", activeTheme);

      // Standard Columns
      const savedStandardCols = localStorage.getItem(STORAGE_STANDARD_COLS_KEY);
      if (savedStandardCols) {
        setStandardColumns({
          ...DEFAULT_STANDARD_COLUMNS,
          ...JSON.parse(savedStandardCols),
        });
      }

      // Row Numbers
      const savedRowNumbers = localStorage.getItem(STORAGE_ROW_NUMBERS_KEY);
      if (savedRowNumbers !== null) {
        setShowRowNumbersState(savedRowNumbers === "true");
      }

      // Shortcuts
      const savedShortcuts = localStorage.getItem(STORAGE_SHORTCUTS_KEY);
      if (savedShortcuts) {
        setShortcutsState({
          ...DEFAULT_SHORTCUTS,
          ...JSON.parse(savedShortcuts),
        });
      }

      // Custom Fields
      let loadedFields = DEFAULT_FIELDS;
      const savedFields = localStorage.getItem(STORAGE_FIELDS_KEY);
      if (savedFields) {
        loadedFields = JSON.parse(savedFields);
        setCustomFields(loadedFields);
      } else {
        const oldCols = localStorage.getItem("jobtrace_columns");
        if (oldCols) {
          try {
            const parsed = JSON.parse(oldCols);
            const migrated: CustomFieldDefinition[] = [
              { id: "salary", name: "Salary", type: "text", enabled: !!parsed.salary },
              { id: "location", name: "Location", type: "text", enabled: !!parsed.location },
              { id: "deadlineDate", name: "Next Round / Deadline", type: "date", enabled: !!parsed.deadlineDate },
            ];
            loadedFields = migrated;
            setCustomFields(migrated);
            localStorage.setItem(STORAGE_FIELDS_KEY, JSON.stringify(migrated));
          } catch {
            setCustomFields(DEFAULT_FIELDS);
          }
        } else {
          setCustomFields(DEFAULT_FIELDS);
        }
      }

      // Column Order
      const savedOrder = localStorage.getItem(STORAGE_COLUMN_ORDER_KEY);
      if (savedOrder) {
        const parsed = JSON.parse(savedOrder) as string[];
        // Ensure any new custom field is included
        const full = [...parsed];
        loadedFields.forEach((f) => {
          if (!full.includes(f.id)) full.push(f.id);
        });
        setColumnOrderState(full);
      } else {
        const allIds = [...BASE_COLUMN_ORDER];
        loadedFields.forEach((f) => {
          if (!allIds.includes(f.id)) allIds.push(f.id);
        });
        setColumnOrderState(allIds);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    try {
      localStorage.setItem(STORAGE_THEME_KEY, newTheme);
    } catch {}
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  const setShowRowNumbers = (show: boolean) => {
    setShowRowNumbersState(show);
    try {
      localStorage.setItem(STORAGE_ROW_NUMBERS_KEY, String(show));
    } catch {}
  };

  const toggleShowRowNumbers = () => {
    setShowRowNumbers(!showRowNumbers);
  };

  const toggleStandardColumn = (key: keyof StandardColumnsSettings) => {
    const updated = {
      ...standardColumns,
      [key]: !standardColumns[key],
    };
    setStandardColumns(updated);
    try {
      localStorage.setItem(STORAGE_STANDARD_COLS_KEY, JSON.stringify(updated));
    } catch {}
  };

  const saveFields = (fields: CustomFieldDefinition[]) => {
    setCustomFields(fields);
    try {
      localStorage.setItem(STORAGE_FIELDS_KEY, JSON.stringify(fields));
    } catch {}

    // Make sure columnOrder has any new field
    const nextOrder = [...columnOrder];
    fields.forEach((f) => {
      if (!nextOrder.includes(f.id)) nextOrder.push(f.id);
    });
    setColumnOrderState(nextOrder);
    try {
      localStorage.setItem(STORAGE_COLUMN_ORDER_KEY, JSON.stringify(nextOrder));
    } catch {}
  };

  const addCustomField = (name: string, type: CustomFieldType = "text") => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const cleanId = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const id = cleanId || `field_${Date.now()}`;

    if (customFields.some((f) => f.id === id || f.name.toLowerCase() === trimmed.toLowerCase())) {
      saveFields(
        customFields.map((f) => (f.id === id ? { ...f, enabled: true } : f))
      );
      return;
    }

    const newField: CustomFieldDefinition = {
      id,
      name: trimmed,
      type,
      enabled: true,
    };
    saveFields([...customFields, newField]);
  };

  const removeCustomField = (id: string) => {
    saveFields(customFields.filter((f) => f.id !== id));
    setColumnOrderState(columnOrder.filter((c) => c !== id));
  };

  const toggleCustomField = (id: string) => {
    saveFields(
      customFields.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const reorderColumns = (sourceId: string, targetId: string, side: "left" | "right" = "left") => {
    if (sourceId === targetId) return;
    const sourceIdx = columnOrder.indexOf(sourceId);
    if (sourceIdx === -1) return;
    const next = [...columnOrder];
    const [moved] = next.splice(sourceIdx, 1);
    const targetIdx = next.indexOf(targetId);
    if (targetIdx === -1) return;
    const insertIdx = side === "left" ? targetIdx : targetIdx + 1;
    next.splice(insertIdx, 0, moved);
    setColumnOrderState(next);
    try {
      localStorage.setItem(STORAGE_COLUMN_ORDER_KEY, JSON.stringify(next));
    } catch {}
  };

  const moveColumn = (id: string, direction: "up" | "down") => {
    const idx = columnOrder.indexOf(id);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= columnOrder.length) return;
    const next = [...columnOrder];
    const [moved] = next.splice(idx, 1);
    next.splice(targetIdx, 0, moved);
    setColumnOrderState(next);
    try {
      localStorage.setItem(STORAGE_COLUMN_ORDER_KEY, JSON.stringify(next));
    } catch {}
  };

  const resetColumnOrder = () => {
    const defaultIds = [...BASE_COLUMN_ORDER];
    customFields.forEach((f) => {
      if (!defaultIds.includes(f.id)) defaultIds.push(f.id);
    });
    setColumnOrderState(defaultIds);
    try {
      localStorage.removeItem(STORAGE_COLUMN_ORDER_KEY);
    } catch {}
  };

  const updateShortcut = (action: keyof ShortcutSettings, key: string) => {
    const updated = { ...shortcuts, [action]: key.toLowerCase() };
    setShortcutsState(updated);
    try {
      localStorage.setItem(STORAGE_SHORTCUTS_KEY, JSON.stringify(updated));
    } catch {}
  };

  const resetShortcuts = () => {
    setShortcutsState(DEFAULT_SHORTCUTS);
    try {
      localStorage.removeItem(STORAGE_SHORTCUTS_KEY);
    } catch {}
  };

  const addStatus = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = statuses.some((s) => s.toLowerCase() === trimmed.toLowerCase());
    if (exists) return;
    const next = [...statuses, trimmed];
    setStatusesState(next);
    try {
      localStorage.setItem(STORAGE_STATUSES_KEY, JSON.stringify(next));
    } catch {}
  };

  const removeStatus = (name: string) => {
    if (statuses.length <= 1) return;
    const next = statuses.filter((s) => s.toLowerCase() !== name.toLowerCase());
    setStatusesState(next);
    try {
      localStorage.setItem(STORAGE_STATUSES_KEY, JSON.stringify(next));
    } catch {}
  };

  const moveStatus = (name: string, direction: "up" | "down") => {
    const idx = statuses.indexOf(name);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= statuses.length) return;
    const next = [...statuses];
    const [moved] = next.splice(idx, 1);
    next.splice(targetIdx, 0, moved);
    setStatusesState(next);
    try {
      localStorage.setItem(STORAGE_STATUSES_KEY, JSON.stringify(next));
    } catch {}
  };

  const reorderStatuses = (sourceName: string, targetName: string, side: "above" | "below" = "above") => {
    if (sourceName === targetName) return;
    const sourceIdx = statuses.indexOf(sourceName);
    if (sourceIdx === -1) return;
    const next = [...statuses];
    const [moved] = next.splice(sourceIdx, 1);
    const targetIdx = next.indexOf(targetName);
    if (targetIdx === -1) return;
    const insertIdx = side === "above" ? targetIdx : targetIdx + 1;
    next.splice(insertIdx, 0, moved);
    setStatusesState(next);
    try {
      localStorage.setItem(STORAGE_STATUSES_KEY, JSON.stringify(next));
    } catch {}
  };

  const resetStatuses = () => {
    setStatusesState(DEFAULT_STATUSES);
    try {
      localStorage.removeItem(STORAGE_STATUSES_KEY);
    } catch {}
  };

  // Backwards compatibility helper
  const columns: ColumnSettings = {
    salary: customFields.some((f) => f.id === "salary" && f.enabled),
    location: customFields.some((f) => f.id === "location" && f.enabled),
    deadlineDate: customFields.some((f) => f.id === "deadlineDate" && f.enabled),
  };
  customFields.forEach((f) => {
    columns[f.id] = f.enabled;
  });

  const setColumnVisible = (columnId: string, visible: boolean) => {
    const exists = customFields.find((f) => f.id === columnId);
    if (exists) {
      toggleCustomField(columnId);
    } else {
      const suggestion = SUGGESTED_FIELDS.find((s) => s.id === columnId);
      if (suggestion) {
        addCustomField(suggestion.name, suggestion.type);
      } else {
        addCustomField(columnId, "text");
      }
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        standardColumns,
        toggleStandardColumn,
        showRowNumbers,
        setShowRowNumbers,
        toggleShowRowNumbers,
        customFields,
        addCustomField,
        removeCustomField,
        toggleCustomField,
        statuses,
        addStatus,
        removeStatus,
        moveStatus,
        reorderStatuses,
        resetStatuses,
        columnOrder,
        reorderColumns,
        moveColumn,
        resetColumnOrder,
        shortcuts,
        updateShortcut,
        resetShortcuts,
        isSettingsOpen,
        setIsSettingsOpen,
        columns,
        setColumnVisible,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
