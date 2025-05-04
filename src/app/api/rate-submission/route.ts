import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { SectionRating, RatingErrorStatus, SubmissionDataForRating, PriceRating, RatingData } from "@/types/ratingTypes"
import { rateTeamSection } from "@/lib/rating/team"
import { rateExperienceSection } from "@/lib/rating/experience"
import { rateCoreSection } from "@/lib/rating/core"
import { ratePriceSection } from "@/lib/rating/price"

import { SupabaseClient } from '@supabase/supabase-js';

// --- Helper Function to Update Submission Status --- 
async function updateSubmissionStatus(
  supabase: SupabaseClient,
  submissionId: string,
  status: 'pending' | 'processing' | 'completed' | 'error',
  errorMessage?: string | undefined
) {
  const updateData: { 
    rating_status: string; 
    rating_data?: RatingErrorStatus | undefined
  } = {
    rating_status: status,
  };
  if (status === 'error') {
    // Assign object matching RatingErrorStatus
    updateData.rating_data = { 
      status: 'error', 
      errorMessage: errorMessage || 'Unknown error during rating' 
    };
  }

  const { error } = await supabase
    .from('submissions')
    .update(updateData)
    .eq('submission_id', submissionId);

  if (error) {
    console.error(`Failed to update submission ${submissionId} status to ${status}:`, error.message);
    // Optionally, throw an error or handle it further if status update failure is critical
  }
}

// --- Main POST Handler ---
export async function POST(request: Request) {
  const supabase = await createClient();
  let submissionId: string;

  try {
    const body = await request.json();
    submissionId = body.submissionId;

    if (!submissionId || typeof submissionId !== 'string') {
      return NextResponse.json({ error: 'Submission ID is required in the request body' }, { status: 400 });
    }

    console.log(`Received request to rate submission: ${submissionId}`);

  } catch (error) {
    console.error('Error parsing request body:', error);
    return NextResponse.json({ error: 'Invalid request body. Expecting { \"submissionId\": \"...\" }' }, { status: 400 });
  }

  try {
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('submission_id, procurement_id, core_data, experience_data, team_data, proposed_price')
      .eq('submission_id', submissionId)
      .single<SubmissionDataForRating>(); // Apply the interface here

    if (fetchError || !submission) {
      console.error('Error fetching submission data:', fetchError?.message);
      // Update status to 'error' before returning
      await updateSubmissionStatus(supabase, submissionId, 'error', `Failed to fetch submission data: ${fetchError?.message || 'Submission not found'}`);
      return NextResponse.json({ error: `Failed to fetch submission data: ${fetchError?.message || 'Submission not found'}` }, { status: 404 });
    }

    // Ensure procurement_id exists for bucket naming / requirements lookup
    if (!submission.procurement_id) {
      await updateSubmissionStatus(supabase, submissionId, 'error', 'Submission is missing procurement_id');
      return NextResponse.json({ error: 'Submission is missing procurement_id' }, { status: 400 });
    }

    // Update status to 'processing'
    await updateSubmissionStatus(supabase, submissionId, 'processing');

    // --- Rate Sections Concurrently --- 
    const [coreRatingResult, experienceRatingResult, teamRatingResult, priceRatingResult] = await Promise.allSettled([
      // Ensure all function calls are correctly placed within the array
      rateCoreSection(supabase, submission.core_data, submission.procurement_id),
      rateExperienceSection(supabase, submission.experience_data, submission.procurement_id),
      rateTeamSection(supabase, submission.team_data, submission.procurement_id),
      ratePriceSection(supabase, submissionId, submission.procurement_id, submission.proposed_price)
    ]);

     // --- Process Settled Promises --- 
     let coreRating: SectionRating | null = null;
     let experienceRating: SectionRating | null = null;
     let teamRating: SectionRating | null = null;
     let priceRating: PriceRating | null = null;

     if (coreRatingResult.status === 'fulfilled') {
       coreRating = coreRatingResult.value;
       console.log(`Core rating successful for ${submissionId}: Score ${coreRating?.overallScore}`);
     } else {
       console.error('Core rating failed:', coreRatingResult.reason);
       // Decide how to handle partial failures - e.g., store partial results or mark as error
     }

     if (experienceRatingResult.status === 'fulfilled') {
       experienceRating = experienceRatingResult.value;
       console.log(`Experience rating successful for ${submissionId}: Score ${experienceRating?.overallScore}`);
     } else {
       console.error('Experience rating failed:', experienceRatingResult.reason);
     }

     if (teamRatingResult.status === 'fulfilled') {
       teamRating = teamRatingResult.value; // Will be the placeholder for now
       console.log(`Team rating successful for ${submissionId}: Score ${teamRating?.overallScore}`);
     } else {
       console.error('Team rating failed:', teamRatingResult.reason);
     }

     if (priceRatingResult.status === 'fulfilled') {
       priceRating = priceRatingResult.value; 
       console.log(`Price rating successful for ${submissionId}: Score ${priceRating?.score}`);
     } else {
       console.error('Price Rating Failed:', priceRatingResult.reason);
       priceRating = { score: 0, reasoning: `Price rating failed: ${priceRatingResult.reason}` }; // Default on failure
     }

     // Check for any failures to set the error message
     const ratingErrors = [
       coreRatingResult,
       experienceRatingResult,
       teamRatingResult,
       priceRatingResult,
     ].filter(r => r.status === 'rejected')
      .map(r => (r as PromiseRejectedResult).reason?.toString() ?? 'Unknown error');

     const overallErrorMessage = ratingErrors.length > 0 ? `Partial rating failure: ${ratingErrors.join('; ')}` : undefined;

     // --- Combine Ratings (Basic Example - weighted average or similar logic needed) --- 
     const finalRatings: RatingData = {
       ratingVersion: '1.0', // Add required field
       ratedAt: new Date().toISOString(), // Add required field
       status: overallErrorMessage ? 'error' : 'completed', // Set status based on errors
       errorMessage: overallErrorMessage, // Add optional error message field
       core: coreRating ?? { overallScore: 0, details: [], overallReasoning: 'Rating failed or incomplete' },
       experience: experienceRating ?? { overallScore: 0, details: [], overallReasoning: 'Rating failed or incomplete' },
       team: teamRating ?? { overallScore: 0, details: [], overallReasoning: 'Rating failed or incomplete' },
       price: priceRating ?? { score: 0, reasoning: 'Rating failed or incomplete' }, 
       overallScore: (
         (coreRating?.overallScore ?? 0) +
         (experienceRating?.overallScore ?? 0) +
         (teamRating?.overallScore ?? 0) +
         (priceRating?.score ?? 0) // Use .score for PriceRating
       ) / 4, // Simple average for now
     };

     // --- Save Final Ratings to Database --- 
     console.log(`Attempting to save final ratings for submission: ${submissionId}`);
     // Determine final status based on rating results
     const finalStatus = finalRatings.status === 'error' ? 'error' : 'completed';
     // Perform a single update with both data and status
     const { error: updateError } = await supabase
       .from('submissions')
       .update({ 
         rating_data: finalRatings, // Save the whole rating object
         rating_status: finalStatus // Set the final status together
       })
       .eq('submission_id', submissionId);

     if (updateError) {
       console.error(`Error saving final ratings for ${submissionId}:`, updateError.message);
       // We still need to try and update the status if the main save failed
       await updateSubmissionStatus(supabase, submissionId, 'error', `Failed to save final rating results: ${updateError.message}`);
       // Modify the response to indicate save failure
       finalRatings.status = 'error'; // Update the status in the object being returned
       finalRatings.errorMessage = finalRatings.errorMessage 
         ? `${finalRatings.errorMessage}; Failed to save results: ${updateError.message}`
         : `Failed to save rating results: ${updateError.message}`;
     } else { // updateError is null, save was successful
       console.log(`Successfully saved final ratings and status ('${finalStatus}') for submission: ${submissionId}`);
       // No need to call updateSubmissionStatus again here, it was done in the combined update.
     }

     // --- Return Final Ratings --- 
     // Use the status determined before the save attempt for the response
     console.log(`Returning final ratings response for ${submissionId} with status: ${finalStatus}`);
     return NextResponse.json(finalRatings, { status: finalRatings.status === 'error' ? 500 : 200 }); // Adjust status code based on final status

  } catch (error: unknown) {
     // --- Catch Block for General Errors --- 
     console.error('Unhandled error during submission rating:', error instanceof Error ? error.message : error);
     // Ensure submissionId is available if possible, might need to extract from request earlier if error happens before fetch
     // Attempt to update status to 'error' if submissionId is known
     // Consider how to get submissionId safely if the error happens early
     // For now, we assume submissionId was successfully parsed before the error
     if (typeof submissionId === 'string') {
       await updateSubmissionStatus(supabase, submissionId, 'error', `Unhandled error: ${error instanceof Error ? error.message : 'Unknown error'}`);
     }
     return NextResponse.json({ error: 'An unexpected error occurred during rating' }, { status: 500 });
   }
}