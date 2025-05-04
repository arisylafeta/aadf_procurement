// Define shared types for Tender data

export interface Criteria {
  id: string;
  name: string; // Added name based on TenderCard usage
  text?: string; // Keep text if used elsewhere
  weight: number;
  rawScore: number; // Added rawScore based on TenderCard usage
}

export interface Tender {
  id: string;
  bidderName: string; // Added bidderName based on TenderCard usage
  tenderName: string; // Added tenderName based on TenderCard usage
  title?: string; // Keep title/description if used by DashboardClient search
  description?: string;
  criteria: Criteria[];
}

// Adding SubmissionItem here as well for consistency
export interface SubmissionItem {
  submission_id: string;
  rating_status: string | null;
}
