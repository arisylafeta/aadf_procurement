import { SupabaseClient } from '@supabase/supabase-js';
import { PriceRating } from '@/types/ratingTypes';

// --- Rate Price Section --- 
export async function ratePriceSection(
  supabase: SupabaseClient,
  currentSubmissionId: string,
  procurementId: string,
  proposedPrice: number | null
): Promise<PriceRating> {
  const logs: string[] = [`[Procurement ${procurementId}] Starting price section rating for submission ${currentSubmissionId}.`];

  const currentPrice = proposedPrice;
  if (typeof currentPrice !== 'number' || currentPrice < 0) {
    logs.push('Current submission has invalid or missing totalCost.');
    console.log(logs.join('\n'));
    return { score: 0, reasoning: 'Current submission has invalid or missing total cost.' };
  }
  logs.push(`Current submission price: ${currentPrice}`);

  try {
    // Fetch financial data (specifically totalCost) for all submissions of the same procurement
    const { data: allSubmissions, error: fetchError } = await supabase
      .from('submissions')
      .select('submission_id, proposed_price')
      .eq('procurement_id', procurementId);

    if (fetchError) {
      throw new Error(`Failed to fetch submissions for procurement ${procurementId}: ${fetchError.message}`);
    }

    if (!allSubmissions || allSubmissions.length === 0) {
      logs.push('No other submissions found for comparison.');
      console.log(logs.join('\n'));
      // If this is the only submission, it could be considered the 'lowest'
      // Or perhaps score should be 0 or 10? Let's default to 10 as it's technically the lowest.
      return { score: 10, reasoning: 'This is the only submission found for this procurement.' };
    }

    let lowestPrice = Infinity;
    let validPricesCount = 0;

    allSubmissions.forEach(sub => {
      const price = sub.proposed_price;
      if (typeof price === 'number' && price >= 0) {
        if (price < lowestPrice) {
          lowestPrice = price;
        }
        validPricesCount++;
      } else {
         logs.push(`  - Submission ${sub.submission_id} skipped: Invalid or missing totalCost.`);
      }
    });

    logs.push(`Found ${validPricesCount} valid prices. Lowest price: ${lowestPrice}`);

    if (lowestPrice === Infinity || lowestPrice <= 0) {
      // Handle cases where no valid positive prices found or lowest is zero/negative
      logs.push('No valid positive lowest price found for comparison. Defaulting score to 0.');
      console.log(logs.join('\n'));
      return { score: 0, reasoning: 'Could not determine a valid positive lowest price for comparison.' };
    }

    // Calculate score using the formula: Score = 10 * (1 - (Price - LowestPrice) / LowestPrice)
    let score = 10 * (1 - (currentPrice - lowestPrice) / lowestPrice);

    // Clamp score between 0 and 10
    score = Math.max(0, Math.min(10, score)); 

    const reasoning = `Score calculated based on own price (${currentPrice}) relative to the lowest price (${lowestPrice}) found among ${validPricesCount} submissions. Formula: 10 * (1 - (${currentPrice} - ${lowestPrice}) / ${lowestPrice})`;
    logs.push(`Calculated score: ${score.toFixed(2)}. Reasoning: ${reasoning}`);
    console.log(logs.join('\n'));

    return {
      score: score,
      reasoning: reasoning
    };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Procurement ${procurementId}] Error during price rating for submission ${currentSubmissionId}:`, message);
    logs.push(`Error during price rating: ${message}`);
    console.log(logs.join('\n'));
    return { score: 0, reasoning: `Failed to calculate price rating: ${message}` };
  }
}