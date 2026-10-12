export type ApplicationStatus = "Applied" | "Rejected" | "Interview" | "Offer" | "Other";

export interface JobApplication {
  id: string;
  userId?: string;
  company: string;
  role: string;
  appliedDate: string;
  url: string;
  status: ApplicationStatus;
  notes: string;
}
