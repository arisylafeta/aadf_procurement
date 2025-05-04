import { SupabaseClient } from '@supabase/supabase-js';
import { SectionRating, RatingDetail } from '@/types/ratingTypes';
import { rateFile, rateTotal } from '@/lib/ai';

// --- Define Team Data Structures --- 
interface TeamMemberDetails {
  fullName?: string;
  profession?: string;
  yearsExperience?: number | string; // Allow string for flexibility, convert later if needed
  cv?: string; // Expect URL
  diplomas?: string; // Expect URL
  credentials?: string; // Expect URL
  // Add any other expected fields for a team member
}

interface TeamDataStructure {
  members?: {
    [role: string]: TeamMemberDetails | undefined; // Allow undefined for robustness
  };
  methodology?: string; // Optional fields from previous observation
  quality_assurance_plan?: string; // Optional fields from previous observation
  // Add other top-level fields if necessary
}

// --- Rate Team Section --- 
export async function rateTeamSection(
  supabase: SupabaseClient, 
  teamData: TeamDataStructure | null, // Use the defined interface
  procurementId: string 
): Promise<SectionRating> {
  console.log("rateTeamSection called with teamData:", JSON.stringify(teamData, null, 2));
 
  const memberRatings: { role: string; rating: number; reasoning: string; details: RatingDetail[] }[] = [];
  const logs: string[] = [`[Procurement ${procurementId}] Starting team section rating.`];
  let overallTeamScore = 0;
  let validMembersCount = 0;
 
  if (!teamData || !teamData.members) {
    console.warn(`Invalid team data for procurement ${procurementId}`);
    logs.push('Invalid or missing team member data.');
    return { overallScore: 0, details: [], overallReasoning: 'Invalid or missing team member data.' };
  }
 
  // Using Promise.all to process members concurrently
  const memberProcessingPromises = Object.entries(teamData.members).map(async ([role, memberDetails]) => {
    if (!memberDetails) return null; 
 
    const memberLogs: string[] = [`Processing member: ${role}`];
 
    const memberFileRatings: RatingDetail[] = [];
    let memberInfoSummary = `Member Role: ${role}\n`;
    memberInfoSummary += `Full Name: ${memberDetails.fullName || 'N/A'}\n`;
    memberInfoSummary += `Profession: ${memberDetails.profession || 'N/A'}\n`;
    memberInfoSummary += `Years of Experience: ${memberDetails.yearsExperience || 'N/A'}\n`;
 
    // --- Rate individual files concurrently --- 
    const fileFields = ['cv', 'diplomas', 'credentials'];
    const fileRatingPromises = fileFields.map(async (field) => {
      const fileUrl = memberDetails[field as keyof TeamMemberDetails]; 
      if (typeof fileUrl === 'string' && fileUrl.startsWith('http')) {
        memberLogs.push(`  - Attempting download for ${field}: ${fileUrl}`);
        let downloadedBuffer: Buffer | null = null;
        let mimeType: string | null = null;
        let bucketName: string | undefined = undefined;
        let filePath: string | undefined = undefined;
 
        try {
          // --- Derive Bucket and Path from URL (adjust if needed) ---
          try {
            const url = new URL(fileUrl);
            const pathSegments = url.pathname.split('/');
            bucketName = procurementId; // Assuming bucket name matches procurementId
            filePath = pathSegments.slice(6).join('/'); // Adjust slice index if URL structure differs
            if (!bucketName || !filePath) throw new Error('Invalid URL path segments for team file');
          } catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e);
            throw new Error(`Invalid document URL format: ${fileUrl}. Original error: ${errMsg}`);
          }
 
          console.log(`Attempting Supabase download: Bucket='${bucketName}', Path='${filePath}'`);
          const { data: blob, error: downloadError } = await supabase.storage
            .from(bucketName)
            .download(filePath);
 
          if (downloadError || !blob) {
            console.error(`Supabase download failed for Bucket='${bucketName}', Path='${filePath}'. Error:`, downloadError);
            throw new Error(`Failed to download ${filePath}: ${downloadError?.message || JSON.stringify(downloadError) || 'Unknown Supabase download error'}`);
          }
 
          downloadedBuffer = Buffer.from(await blob.arrayBuffer());
          mimeType = filePath.toLowerCase().endsWith('.pdf') ? 'application/pdf' : blob.type || 'application/octet-stream';
          memberLogs.push(`    - Download successful for ${field}.`);
 
          // --- AI Rating (moved inside try block) --- 
          try {
            const prompt = `Rate the relevance and quality of this ${field} document for a ${memberDetails.profession || 'professional'} in the role of ${role}. Focus on clarity, completeness, and relevance to the role requirements.`;
            const fileRating = await rateFile(prompt, downloadedBuffer, mimeType);
            memberLogs.push(`    - AI rating successful for ${field}: Score ${fileRating.object.rating}/10`);
            return { fieldName: `${role}.${field}`, rating: fileRating.object.rating, reasoning: fileRating.object.reasoning };
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`AI rating failed for ${role}.${field} (Procurement: ${procurementId}):`, message);
            memberLogs.push(`    - AI rating failed for ${field}: ${message}`);
            return { fieldName: `${role}.${field}`, rating: 0, reasoning: `AI rating failed: ${message}` }; // Use rating
          }
        } catch (downloadOrProcessingError) {
          // Catch errors from URL parsing, download, or buffer conversion
          const message = downloadOrProcessingError instanceof Error ? downloadOrProcessingError.message : String(downloadOrProcessingError);
          memberLogs.push(`    - Download failed for ${field}: ${message}`);
          return { fieldName: `${role}.${field}`, rating: 0, reasoning: `File download/processing failed: ${message}` };
        }
      } else {
        // Handle cases where fileUrl is missing or not a string/http
        memberLogs.push(`  - No valid URL for ${field}.`);
        return { fieldName: `${role}.${field}`, rating: 0, reasoning: 'File URL missing or invalid.' }; 
      }
    });
 
    const settledFileRatings = await Promise.allSettled(fileRatingPromises);
    settledFileRatings.forEach(result => {
       if (result.status === 'fulfilled') {
           memberFileRatings.push(result.value);
           memberInfoSummary += `${result.value.fieldName.split('.')[1].charAt(0).toUpperCase() + result.value.fieldName.split('.')[1].slice(1)} Rating: ${result.value.rating}/10 (${result.value.reasoning})\n`;
       } else {
           // Should not happen with current logic, but handle defensively
           console.error("Unexpected file rating promise rejection:", result.reason);
           memberInfoSummary += `Unknown File Rating: Failed\n`; 
       }
    });
 
    // --- Get overall member rating using rateTotal ---
    try {
      const totalRatingPrompt = `Based on the following information and individual document ratings, provide an overall suitability rating (0-10) for this team member (${role}) and brief reasoning:\n\n${memberInfoSummary}`;
      memberLogs.push(`  - Attempting overall rating for ${role}.`);
      const totalRatingResult = await rateTotal(totalRatingPrompt);
      const totalRatingResultText = totalRatingResult.text; // Access the text property
 
      // Attempt to parse rating and reasoning
      const ratingMatch = totalRatingResultText.match(/rating:\s*(\d{1,2})/i);
      let rating = ratingMatch ? parseInt(ratingMatch[1], 10) : 0;
      if (rating < 0 || rating > 10) rating = 0; // Clamp rating
      const reasoning = totalRatingResultText.split(/rating:\s*\d{1,2}/i)[1]?.trim() || totalRatingResultText; // Keep reasoning extraction
 
      memberLogs.push(`  - Overall rating successful for ${role}: Score ${rating}/10`);
      logs.push(...memberLogs); // Add member logs to main logs
 
      return { role, rating, reasoning, details: memberFileRatings, status: 'success' }; // Use rating
 
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`rateTotal failed for member ${role} (Procurement: ${procurementId}):`, message);
      memberLogs.push(`  - Overall rating failed for ${role}: ${message}`);
      logs.push(...memberLogs); // Add member logs to main logs
      return { role, rating: 0, reasoning: `Overall rating failed: ${message}`, details: memberFileRatings, status: 'failed' }; // Use rating
    }
  });
 
  const processedMembers = await Promise.all(memberProcessingPromises);
 
  processedMembers.forEach(memberResult => {
    if (memberResult && memberResult.status === 'success') {
        memberRatings.push(memberResult);
        overallTeamScore += memberResult.rating;
        validMembersCount++;
    } else if (memberResult && memberResult.status === 'failed') {
        // Include failed members in the details for transparency
        logs.push(`Member ${memberResult.role} processing failed: ${memberResult.reasoning}`);
        memberRatings.push(memberResult);
    }
  });
 
  // --- (Optional) Rate Methodology and QA Plan --- 
 
  logs.push(`Finished processing ${processedMembers.length} members. ${validMembersCount} succeeded.`);
 
  // --- Calculate final score and reasoning ---
  const finalScore = validMembersCount > 0 ? overallTeamScore / validMembersCount : 0;
  const overallReasoning = `Team rating based on ${validMembersCount} evaluated members. Average Score: ${finalScore.toFixed(1)}/10. See details for individual member evaluations.`;
 
  logs.push(`Calculated final team score: ${finalScore.toFixed(1)}/10.`);
 
  // Log all collected messages
  console.log(logs.join('\n'));
 
  // --- Structure details for SectionRating --- 
  const sectionDetails: RatingDetail[] = memberRatings.flatMap(mr => [
    // Member overall rating
    { 
      fieldName: `member.${mr.role}.overall`, 
      rating: mr.rating, 
      reasoning: mr.reasoning 
    },
    // Individual file ratings for the member
    ...mr.details 
  ]);
 
  return {
    overallScore: finalScore,
    details: sectionDetails,
    overallReasoning: overallReasoning,
  };
}