'use server';

import { StorageError } from '@supabase/storage-js';
import { createClient } from '@/utils/supabase/server';
import { SubmissionData, SubmissionStaffMember } from '@/types/procurementForm'; 
import { PostgrestError } from '@supabase/supabase-js'; 

// const BUCKET_NAME = 'procurement-submissions'; 

interface SubmissionResponse {
  success: boolean;
  message: string;
  submissionId?: string;
  error?: PostgrestError | StorageError | Error | unknown; 
}

export async function submitProcurementApplication(
  submissionData: SubmissionData 
): Promise<SubmissionResponse> { 
  const supabase = await createClient();

  // Destructure to get IDs, but we'll use submissionData directly for the insert fields
  const { procurementId, submissionId } = submissionData;

  if (!procurementId) {
    console.error('Procurement ID is missing from the submission data.');
    return {
      success: false,
      message: 'Submission failed: Procurement ID is missing.',
      error: new Error('Missing procurementId'),
    };
  }
  if (!submissionId) {
    console.error('Submission ID is missing from the submission data.');
    return {
        success: false,
        message: 'Submission failed: Submission ID is missing.',
        error: new Error('Missing submissionId'),
    };
  }

  console.log(`Processing submission for Procurement ID: ${procurementId}, Submission ID: ${submissionId}`);
  console.log('Received Submission Data:', JSON.stringify(submissionData, null, 2));

  try {
    // Define a type for team member attributes
    type TeamMemberAttributes = {
      [attribute: string]: string | number | boolean | SubmissionStaffMember[] | null | undefined;
    };
    
    // Dynamically build the nested team members structure
    const nestedMembers: { [role: string]: TeamMemberAttributes } = {};
    for (const key in submissionData) {
      if (key.startsWith('team_members.')) {
        const parts = key.split('.');
        if (parts.length === 3) {
          const [, role, attribute] = parts;
          if (!nestedMembers[role]) {
            nestedMembers[role] = {};
          }
          nestedMembers[role][attribute] = submissionData[key];
        }
      }
    }

    // Group data into JSONB structures matching the new table schema
    const core_data = {
      business_registration_number: submissionData.businessRegistrationNumber,
      license: submissionData.license,
      criminal_record_certificate: submissionData.criminalRecordCertificate,
      certificate_no_pending_lawsuit: submissionData.certificateNoPendingLawsuit,
      certificate_good_standing: submissionData.certificateGoodStanding,
      tax_clearance: submissionData.taxClearance,
      // Add any other relevant 'core' fields here
    };

    const experience_data = {
      similar_projects_evidence: submissionData.similarProjectsEvidence,
      urban_trails_evidence: submissionData.urbanTrailsEvidence,
      // Add any other relevant 'experience' fields here
    };

    // Construct the team_data JSONB object with the nested structure
    const team_data = {
      members: nestedMembers, // Include the dynamically built nested members
      methodology: submissionData.teamMethodology, // Keep methodology
      quality_assurance_plan: submissionData.qualityAssurancePlan, // Keep QA plan
      staff_members: submissionData.staffMembers // Keep the additional staff array
      // Remove old flat landscape architect fields
    };

    // Prepare the final object for insertion
    const insertData = {
      submission_id: submissionId,
      procurement_id: procurementId,
      proposed_price: submissionData.proposedPrice,
      core_data: core_data,
      experience_data: experience_data,
      team_data: team_data
    };

    console.log("Data being inserted (JSONB structure):", JSON.stringify(insertData, null, 2));

    const { data: submissionResult, error: submissionError } = await supabase
      .from('submissions')
      .insert([insertData]) // Insert the structured object
      .select(); 

    if (submissionError) {
      console.error('Error inserting submission data:', submissionError);
      return {
        success: false,
        message: `Database error: ${submissionError.message}`,
        error: submissionError,
      };
    }

    console.log('Submission successfully recorded:', submissionResult);
    return {
      success: true,
      message: 'Application submitted successfully!',
      submissionId: submissionId,
    };

  } catch (error: unknown) {
    console.error('Error during submission process:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred during submission.';
    return {
      success: false,
      message: message,
      error: error, 
    };
  }
}
