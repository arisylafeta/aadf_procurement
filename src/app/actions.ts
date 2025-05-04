'use server';

import { createClient } from '@/utils/supabase/server';
import { SubmissionItem } from '@/types/tender'; // Import the shared type

export interface FetchSubmissionsResult {
  submissions: SubmissionItem[] | null;
  error: string | null;
}

export async function fetchSubmissions(): Promise<FetchSubmissionsResult> {
  const supabase = await createClient(); // Add await back: server.ts createClient is async

  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('submission_id, rating_status')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions:', error);
      throw new Error(error.message);
    }

    // Ensure data conforms to SubmissionItem[] or is null
    const submissions: SubmissionItem[] | null = data as SubmissionItem[] | null;
    
    return { submissions, error: null };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Server action fetchSubmissions failed:', errorMessage);
    return { submissions: null, error: errorMessage };
  }
}
