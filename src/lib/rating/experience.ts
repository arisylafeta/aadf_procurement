import { SupabaseClient } from '@supabase/supabase-js';
import { SectionRating, RatingDetail } from '@/types/ratingTypes';
import requirementsData from '@/data/requirements.json';
import { rateFile } from '@/lib/ai';

// --- Rate Experience Section --- 
export async function rateExperienceSection(
  supabase: SupabaseClient,
  experienceData: Record<string, unknown> | null,
  procurementId: string // Needed to potentially structure file paths or identify reqs
): Promise<SectionRating> {
  const ratingDetails: RatingDetail[] = [];
  const ratingPromises: Promise<void>[] = [];

  // Get the tender value from requirements.json
  // Correct path based on lint error: requirementsData.price.ceiling
  const tenderValueCeiling = requirementsData.price?.ceiling;
  if (typeof tenderValueCeiling !== 'number') {
    console.error("Could not read price.ceiling from requirements.json");
    return { overallScore: 0, details: [], overallReasoning: 'Configuration error: Tender value missing.' };
  }
  const valueThreshold = tenderValueCeiling * 0.5;

  if (!experienceData) {
    return { overallScore: 0, details: [], overallReasoning: 'No experience data provided.' };
  }

  for (const [key, value] of Object.entries(experienceData)) {
    // Expect file URLs as strings, skip others
    if (typeof value !== 'string' || !value.startsWith('https://')) {
      console.warn(`Skipping non-URL value for key ${key} in experienceData`);
      continue;
    }

    const fileUrl = value;
    const fieldName = key; // e.g., 'relevant_projects', 'case_study_1'

    ratingPromises.push(
      (async () => {
        let downloadedBuffer: Buffer | null = null;
        let mimeType: string | null = null;
        try {
          // --- File Download Logic (adjust bucket/path as needed) ---
          console.log(`Processing experience document: ${fieldName} (${fileUrl})`);
          let bucketName: string | undefined;
          let filePath: string | undefined;
          try {
              const url = new URL(fileUrl);
              const pathSegments = url.pathname.split('/');
              // *** Adjust bucket/path derivation logic as needed ***
              bucketName = procurementId; // Example: Use procurementId as bucket
              filePath = pathSegments.slice(6).join('/'); // Example: Skip first 6 segments
              if (!bucketName || !filePath) throw new Error('Invalid URL path segments for experience data');
          } catch (e) {
              const errMsg = e instanceof Error ? e.message : String(e);
              throw new Error(`Invalid document URL format: ${fileUrl}. Original error: ${errMsg}`);
          }

          console.log(`Attempting download: Bucket='${bucketName}', Path='${filePath}'`);
          const { data: blob, error: downloadError } = await supabase.storage
            .from(bucketName)
            .download(filePath);

          if (downloadError || !blob) {
            console.error(`Download failed for Bucket='${bucketName}', Path='${filePath}'. Error:`, downloadError);
            throw new Error(`Failed to download ${filePath}: ${downloadError?.message || JSON.stringify(downloadError) || 'Unknown Supabase download error'}`);
          }
          downloadedBuffer = Buffer.from(await blob.arrayBuffer());
          mimeType = filePath.toLowerCase().endsWith('.pdf') ? 'application/pdf' : blob.type || 'application/octet-stream';
          console.log(`Successfully downloaded file for experience field: ${fieldName}`);
          
          if (!downloadedBuffer || !mimeType) {
              throw new Error("Missing file buffer or mime type after download attempt.");
          }
          
          // --- Dynamic Prompt ---
          const experiencePrompt = `Evaluate the attached experience document provided for the field named '${fieldName}'.
          Assess the following criteria based strictly on the document's content:
          1.  **Accuracy:** Is the information presented verifiable and factually sound?
          2.  **Value Threshold:** Does the project/experience described explicitly state or strongly imply a value exceeding ${valueThreshold.toLocaleString()} (50% of the current tender value)?
          3.  **Applicability:** Is the experience described directly relevant and applicable to the requirements suggested by the field name '${fieldName}'?

          Provide a single overall numerical rating (0-10, where 10 means all criteria are excellently met) and concise reasoning addressing each of the three criteria (Accuracy, Value Threshold, Applicability).`;

          // --- Call AI ---
          const aiResult = await rateFile(experiencePrompt, downloadedBuffer, mimeType);

          ratingDetails.push({
            documentName: fieldName,
            documentUrl: fileUrl,
            rating: aiResult.object.rating,
            reasoning: aiResult.object.reasoning,
          });

        } catch (error) {
          console.error(`Error processing experience document ${fieldName} (${fileUrl}):`, error);
          ratingDetails.push({
            documentName: fieldName,
            documentUrl: fileUrl,
            rating: 0, // Assign 0 score on failure
            reasoning: `Rating failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 
          });
        }
      })()
    );
  }

  await Promise.allSettled(ratingPromises);

  let scoreSum = 0;
  let ratedCount = 0;
  ratingDetails.forEach(detail => {
    // Only average scores from successful ratings
    if (!detail.reasoning?.startsWith('Rating failed:')) {
       scoreSum += detail.rating;
       ratedCount++;
    }
  });

  const overallScore = ratedCount > 0 ? Math.round(scoreSum / ratedCount) : 0;
  const overallReasoning = `Overall experience score based on average of ${ratedCount} successfully rated documents out of ${ratingDetails.length} total.`;

  return { overallScore, details: ratingDetails, overallReasoning };
}