export type ApplicationStatus = "Applied" | "Rejected" | "Interview" | "Offer" | "Other" | (string & {});

export type CustomFieldType = "text" | "number" | "date";

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  enabled: boolean;
}

export interface InterviewRoundNotes {
  id: string;
  round: string;
  bullets: string[];
}

export interface JobHighlights {
  requirements: string[];
  techStack: string[];
  interviewNotes: InterviewRoundNotes[];
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
  customFields?: Record<string, string>;
  highlights?: JobHighlights;
  salary?: string;
  location?: string;
  deadlineDate?: string;
}
