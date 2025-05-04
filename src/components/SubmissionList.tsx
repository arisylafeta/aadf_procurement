'use client';

import React, { useState } from 'react';

// Define the shape of a submission item we expect as a prop
interface SubmissionItem {
  submission_id: string;
  rating_status: string | null;
}

// Define the props for the component
interface SubmissionListProps {
  submissions: SubmissionItem[];
}

export function SubmissionList({ submissions }: SubmissionListProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errorStates, setErrorStates] = useState<Record<string, string | null>>({});

  const handleGenerateRating = async (submissionId: string) => {
    setLoadingStates(prev => ({ ...prev, [submissionId]: true }));
    setErrorStates(prev => ({ ...prev, [submissionId]: null }));

    try {
      const response = await fetch('/api/rate-submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ submissionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Optionally: Refresh data or update UI state upon success
      // For now, just log success and stop loading
      console.log(`Rating initiated successfully for ${submissionId}`);
      // You might want to update the local state or re-fetch submissions here
      // to reflect the status change without a page reload.
      alert(`Rating process started for ${submissionId}. Refresh the page later to see updates.`);

    } catch (error) {
      console.error(`Failed to generate rating for ${submissionId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrorStates(prev => ({ ...prev, [submissionId]: errorMessage }));
      alert(`Error starting rating for ${submissionId}: ${errorMessage}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {submissions.map((sub) => {
        const isPending = !sub.rating_status || sub.rating_status === 'pending';
        const isLoading = loadingStates[sub.submission_id];
        const error = errorStates[sub.submission_id];

        return (
          <div
            key={sub.submission_id}
            className={`border rounded-lg p-4 shadow ${isPending ? 'bg-gray-100' : 'bg-white'}`}
          >
            <h3 className="font-semibold mb-2">Submission ID:</h3>
            <p className="text-sm truncate mb-4">{sub.submission_id}</p>
            <div className="flex justify-between items-center">
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${ 
                    isPending ? 'bg-yellow-100 text-yellow-800' 
                    : sub.rating_status === 'completed' ? 'bg-green-100 text-green-800' 
                    : sub.rating_status === 'processing' ? 'bg-blue-100 text-blue-800' 
                    : 'bg-red-100 text-red-800' 
                }`}>
                Status: {sub.rating_status || 'pending'}
              </span>
              {isPending && (
                <button
                  onClick={() => handleGenerateRating(sub.submission_id)}
                  disabled={isLoading}
                  className={`px-3 py-1 text-sm font-medium rounded text-white ${isLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? 'Generating...' : 'Generate Rating'}
                </button>
              )}
            </div>
             {error && (
                <p className="text-red-600 text-xs mt-2">Error: {error}</p>
             )}
          </div>
        );
      })}
    </div>
  );
}
