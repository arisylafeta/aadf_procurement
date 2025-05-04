import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  
  // Get status from query parameters
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  
  try {
    // Build query
    let query = supabase
      .from('submissions')
      // Remove company_name and procurement_title for now
      .select('submission_id, rating_status, rating_data, procurement_id');
    
    // Apply status filter if provided
    if (status) {
      query = query.eq('rating_status', status);
    }
    
    // Execute query
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions:', error);
      return NextResponse.json(
        { error: `Failed to fetch submissions: ${error.message}` }, 
        { status: 500 }
      );
    }

    // Return the data
    return NextResponse.json(data);
    
  } catch (err) {
    console.error('Unhandled error fetching submissions:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: `Failed to fetch submissions: ${errorMessage}` }, 
      { status: 500 }
    );
  }
}
