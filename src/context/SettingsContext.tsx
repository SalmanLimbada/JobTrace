"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { CustomFieldDefinition, CustomFieldType } from "@/types/job";

export type AppTheme = "dark" | "light";

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
  customFields: CustomFieldDefinition[];
  addCustomField: (name: string, type?: CustomFieldType) => void;
  removeCustomField: (id: string) => void;
  toggleCustomField: (id: string) => void;
  columns: ColumnSettings;
  setColumnVisible: (column: string, visible: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_THEME_KEY = "jobtrace_theme";
const STORAGE_FIELDS_KEY = "jobtrace_custom_fields_v2";

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("dark");
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(DEFAULT_FIELDS);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_THEME_KEY);
      const activeTheme: AppTheme = savedTheme === "light" ? "light" : "dark";
      setThemeState(activeTheme);
      document.documentElement.setAttribute("data-theme", activeTheme);

      const savedFields = localStorage.getItem(STORAGE_FIELDS_KEY);
      if (savedFields) {
        setCustomFields(JSON.parse(savedFields));
      } else {
        // Check if old jobtrace_columns exists for migration
        const oldCols = localStorage.getItem("jobtrace_columns");
        if (oldCols) {
          try {
            const parsed = JSON.parse(oldCols);
            const migrated: CustomFieldDefinition[] = [
              { id: "salary", name: "Salary", type: "text", enabled: !!parsed.salary },
              { id: "location", name: "Location", type: "text", enabled: !!parsed.location },
              { id: "deadlineDate", name: "Next Round / Deadline", type: "date", enabled: !!parsed.deadlineDate },
            ];
            setCustomFields(migrated);
            localStorage.setItem(STORAGE_FIELDS_KEY, JSON.stringify(migrated));
          } catch {
            setCustomFields(DEFAULT_FIELDS);
          }
        } else {
          setCustomFields(DEFAULT_FIELDS);
        }
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

  const saveFields = (fields: CustomFieldDefinition[]) => {
    setCustomFields(fields);
    try {
      localStorage.setItem(STORAGE_FIELDS_KEY, JSON.stringify(fields));
    } catch {}
  };

  const addCustomField = (name: string, type: CustomFieldType = "text") => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const cleanId = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const id = cleanId || `field_${Date.now()}`;

    // Prevent duplicates
    if (customFields.some((f) => f.id === id || f.name.toLowerCase() === trimmed.toLowerCase())) {
      // If exists, make sure it's enabled
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
  };

  const toggleCustomField = (id: string) => {
    saveFields(
      customFields.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
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
      // Add suggested field
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
        customFields,
        addCustomField,
        removeCustomField,
        toggleCustomField,
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
