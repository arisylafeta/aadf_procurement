// --- Define Rating Types --- 
export interface RatingDetail {
  documentName?: string; 
  documentUrl?: string;  
  rating: number;       
  reasoning: string;    
  criteria?: string;    
}

export interface SectionRating {
  overallScore: number; 
  details: RatingDetail[]; 
  overallReasoning?: string; 
}

export interface PriceRating {
  score: number;        
  reasoning: string;    
}

export interface RatingData { 
  ratingVersion: string;
  ratedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
  overallScore: number;
  price: PriceRating; 
  core: SectionRating; 
  experience: SectionRating; 
  team: SectionRating; 
}

// --- Type for Supabase Query Result --- 
export interface SubmissionDataForRating {
  submission_id: string;
  procurement_id: string | null; 
  core_data: Record<string, unknown> | null;
  experience_data: Record<string, unknown> | null; 
  team_data: Record<string, unknown> | null; 
  proposed_price: number | null;
}

// --- Define Rating Error Status Type ---
export interface RatingErrorStatus {
  status: 'error';
  errorMessage: string;
}
