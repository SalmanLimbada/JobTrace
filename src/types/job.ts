export type ApplicationStatus = "Applied" | "Rejected" | "Interview" | "Offer" | "Other" | (string & {});

export type CustomFieldType = "text" | "number" | "date";

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  enabled: boolean;
}

export type RequirementsDisplayMode = "drawer" | "column";

export interface ExtensionSettings {
  extractRequirements: boolean;
  requirementsDisplay: RequirementsDisplayMode;
  targetFields: string[];
  updatedAt?: number;
}

export interface JobApplication {
  id: string;
  userId?: string;
  company: string;
  role: string;
  appliedDate: string;
  url: string;
  status: ApplicationStatus;
  notes: string;
  keyRequirements?: string[];
  customFields?: Record<string, string>;
  salary?: string;
  location?: string;
  deadlineDate?: string;
  jobId?: string;
  createdAt?: string;
}
