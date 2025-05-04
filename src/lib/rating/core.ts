import { SupabaseClient } from '@supabase/supabase-js';
import { SectionRating, RatingDetail } from '@/types/ratingTypes';
import { rateFile } from '@/lib/ai';

// --- Helper Function to Rate Core Section --- 
export async function rateCoreSection(
    supabase: SupabaseClient,
    coreData: Record<string, unknown> | null | undefined, 
    procurementId: string
  ): Promise<SectionRating> {
    const ratingDetails: RatingDetail[] = [];
    const ratingPromises: Promise<void>[] = [];
  
    if (!coreData || typeof coreData !== 'object') {
      return { overallScore: 0, details: [], overallReasoning: 'No core data provided.' };
    }
  
    for (const [key, value] of Object.entries(coreData)) {
      if (typeof value !== 'string') {
        console.warn(`Skipping non-string value for key ${key} in coreData`);
        continue; // Skip this entry
      }
  
      if (value.startsWith('http')) {
        const fileUrl = value;
        const fieldName = key; 
  
        ratingPromises.push(
          (async () => {
            let downloadedBuffer: Buffer | null = null;
            let mimeType: string | null = null;
            try {
              let bucketName: string | undefined;
              let filePath: string | undefined;
              try {
                const url = new URL(fileUrl);
                const pathSegments = url.pathname.split('/');
                bucketName = procurementId; 
                filePath = pathSegments.slice(6).join('/');
                if (!bucketName || !filePath) throw new Error('Invalid URL path segments');
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
              console.log(`Successfully downloaded file for core field: ${fieldName}`);
  
              // Define the dynamic prompt using the fieldName
              const corePrompt = `Evaluate the attached document provided for the field '${fieldName}'. Assess its compliance and completeness based on typical procurement requirements for such a document. Provide a numerical rating (0-10, where 10 is excellent) and concise reasoning based strictly on the document's content.`;
  
              if (!downloadedBuffer || !mimeType) {
                   throw new Error("Missing file buffer or mime type after download attempt.");
              }
              // Call rateFile with the dynamic prompt
              const aiResult = await rateFile(corePrompt, downloadedBuffer, mimeType); 
  
              ratingDetails.push({
                documentName: fieldName,
                documentUrl: fileUrl,
                rating: aiResult.object.rating,
                reasoning: aiResult.object.reasoning,
              });
  
            } catch (error) {
              console.error(`Error processing core document ${fieldName} (${fileUrl}):`, error);
              ratingDetails.push({
                documentName: fieldName,
                documentUrl: fileUrl,
                rating: 0,
                reasoning: `Rating failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 
              });
            }
          })()
        );
      }
    }
  
    await Promise.allSettled(ratingPromises);
  
    let scoreSum = 0;
    ratingDetails.forEach(detail => scoreSum += detail.rating);
    const overallScore = ratingDetails.length > 0 ? Math.round(scoreSum / ratingDetails.length) : 0;
    const overallReasoning = `Overall core score based on average of ${ratingDetails.length} rated documents.`;
  
    return { overallScore, details: ratingDetails, overallReasoning };
  }