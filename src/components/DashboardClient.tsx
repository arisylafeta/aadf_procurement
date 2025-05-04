"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Tender, Criteria } from '@/types/tender';

// --- Add Type Definitions (or import from a types file) ---
interface RatingDataDetails {
  rating?: number;
  reasoning: string;
  documentUrl?: string;
  documentName?: string;
  fieldName?: string; // Used in team details
}

interface RatingSection<TDetails = RatingDataDetails> {
  details?: TDetails[];
  overallScore: number;
  overallReasoning: string;
}

interface PriceRating {
    score: number;
    reasoning: string;
}

interface FullRatingData {
  core: RatingSection;
  team: RatingSection;
  price: PriceRating;
  experience: RatingSection;
  status: string; // e.g., "completed"
  ratedAt: string; // ISO Date string
  overallScore: number;
  ratingVersion: string;
}

// Define the structure of submissions returned from the API
interface Submission {
  submission_id: string;
  company_name?: string; // May not exist for all submissions
  procurement_title?: string; // May not exist for all submissions
  procurement_id?: string;
  rating_status: string;
  rating_data?: FullRatingData; // May be null for incomplete submissions
}

// Define placeholder weights (consider fetching these from procurement settings)
const CRITERIA_WEIGHTS = {
  core: 30,
  experience: 30,
  team: 30,
  price: 10,
};

// --- Helper Functions --- 
const calculateWeightedScore = (criterion: Criteria): number => {
  // Ensure rawScore and weight are numbers, default to 0 if not
  const score = typeof criterion.rawScore === 'number' ? criterion.rawScore : 0;
  const weight = typeof criterion.weight === 'number' ? criterion.weight : 0;
  return score * (weight / 100);
};

const calculateTotalScore = (tender: Tender): number => {
  if (!tender || !Array.isArray(tender.criteria)) return 0;
  return tender.criteria.reduce((sum, criterion) => sum + calculateWeightedScore(criterion), 0);
};

const getQualificationStatus = (tender: Tender): { qualified: boolean; reason?: string } => {
  if (!tender || !Array.isArray(tender.criteria)) return { qualified: false, reason: 'Invalid tender data' };

  // Example: Disqualify if any criterion score is below 3
  const failingCriterion = tender.criteria.find(c => typeof c.rawScore === 'number' && c.rawScore < 3);
  if (failingCriterion) {
    return { qualified: false, reason: `Score too low for ${failingCriterion.name || 'unnamed criterion'}` };
  }

  // Example: Disqualify if total score is below 5
  const totalScore = calculateTotalScore(tender);
  if (totalScore < 5) {
    return { qualified: false, reason: `Overall score ${totalScore.toFixed(2)} is below minimum threshold of 5` };
  }

  return { qualified: true };
};

const getProgressBarColor = (qualified: boolean, percent: number): string => {
  if (!qualified) return 'bg-red-500'; // Red for disqualified
  if (percent < 50) return 'bg-yellow-500'; // Yellow for low scores
  if (percent < 80) return 'bg-blue-500'; // Blue for medium scores
  return 'bg-green-500'; // Green for high scores
};

// --- TenderCard Component --- 
type TenderWithDetails = Tender & { ratingDetails?: FullRatingData };

const TenderCard: React.FC<{ tender: TenderWithDetails; rank?: number; showRank?: boolean; showReasoningFeature?: boolean }> = ({ tender, rank, showRank = true, showReasoningFeature = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  // Use the overall score directly from rating data if available, otherwise calculate
  const totalScore = tender.ratingDetails?.overallScore ?? calculateTotalScore(tender);
  const { qualified, reason } = getQualificationStatus(tender); // This might need adjustment based on rating_data
  // Scale score (adjust max based on actual scale, e.g. 10) to percentage
  const maxPossibleScore = 10; // Assuming max score is 10
  const percent = Math.min(Math.max((totalScore / maxPossibleScore) * 100, 0), 100);
  const progressBarColor = getProgressBarColor(qualified, percent);

  return (
    <div className="mb-4 flex items-start group">
      <div className="flex-1">
        {/* Main Card Body */} 
        <div 
          className={`relative border rounded-t-lg ${showReasoningFeature ? '' : 'rounded-b-lg'} shadow-md p-4 bg-white dark:bg-gray-800 transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[600px]' : 'max-h-36'} ${!showReasoningFeature || !isExpanded ? 'group-hover:shadow-xl group-hover:border-blue-400': ''} overflow-hidden cursor-pointer`}
          onClick={() => setIsExpanded(!isExpanded)} // Allow expanding even with reasoning feature
        >
          {/* Ranking Number Badge */} 
          {showRank && (
            <div className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full text-sm font-bold shadow-md">
              {rank}
            </div>
          )}
          {/* Card Content Wrapper */} 
          <div className="pl-10">
            {/* Actual Card Content Starts Here */} 
            <div className="flex justify-between items-start mb-2">
              <div className="flex-grow min-w-0"> {/* Added min-w-0 for better truncation */} 
                <p className="text-gray-800 dark:text-gray-200 text-lg font-semibold mb-1 truncate" title={tender.bidderName}>{tender.bidderName || 'N/A'}</p>
              </div>
              {/* Status & Score Pills */} 
              <div className="flex items-center flex-shrink-0 ml-2"> {/* Added ml-2 */} 
                <span 
                  className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${qualified ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}> 
                  {qualified ? 'Qualified' : 'Disqualified'}
                </span>
                <span
                  className={`ml-2 px-3 py-1 text-sm font-bold text-white rounded-full ${progressBarColor}`}
                >
                  {/* Display overall score directly */} 
                  {totalScore.toFixed(1)} / {maxPossibleScore}
                </span>
              </div>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1 truncate" title={tender.tenderName}>Tender: {tender.tenderName || 'N/A'}</p>

            {/* Progress Bar based on percentage */} 
            <div className="w-full pt-1"> {/* Add padding top */} 
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className={`h-2.5 rounded-full ${progressBarColor} transition-all duration-500 ease-out`}
                  style={{ width: `${percent}%` }}
                ></div>
              </div>
            </div>
            {/* End Actual Card Content */} 
          </div>
          {/* Expanded Details - Updated to show rating_data */} 
          <div className={`transition-all duration-300 ease-in-out overflow-auto ${isExpanded ? 'max-h-[500px] opacity-100 pt-4 pl-10 pr-4' : 'max-h-0 opacity-0'}`}> 
             {isExpanded && tender.ratingDetails && (
                 <div className="space-y-4 pb-2">
                    {!qualified && reason && (
                      <p className="text-sm text-red-600 dark:text-red-400 mb-2">Reason for Disqualification: {reason}</p>
                    )}
                    
                    {/* Summary Scores */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Overall Scores</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white dark:bg-gray-700 rounded p-2 text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Core</p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{tender.ratingDetails.core.overallScore.toFixed(1)}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-700 rounded p-2 text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Experience</p>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">{tender.ratingDetails.experience.overallScore.toFixed(1)}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-700 rounded p-2 text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Team</p>
                          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{tender.ratingDetails.team.overallScore.toFixed(1)}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-700 rounded p-2 text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Price</p>
                          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{tender.ratingDetails.price.score.toFixed(1)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Core Details */}
                    <div className="border-l-4 border-blue-400 pl-3 py-1">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Core Requirements</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic mb-2">{tender.ratingDetails.core.overallReasoning}</p>
                      
                      {tender.ratingDetails.core.details?.map((detail, index) => (
                        <div key={`core-${index}`} className="mb-2 bg-white dark:bg-gray-800 p-2 rounded-md shadow-sm">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-medium">{detail.documentName || 'Document'}</p>
                            <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                              {detail.rating?.toFixed(1) || 'N/A'}/10
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{detail.reasoning}</p>
                        </div>
                      ))}
                    </div>
                    
                    {/* Experience Details */}
                    <div className="border-l-4 border-green-400 pl-3 py-1">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Experience</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic mb-2">{tender.ratingDetails.experience.overallReasoning}</p>
                      
                      {tender.ratingDetails.experience.details?.map((detail, index) => (
                        <div key={`exp-${index}`} className="mb-2 bg-white dark:bg-gray-800 p-2 rounded-md shadow-sm">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-medium">{detail.documentName || 'Document'}</p>
                            <span className="text-xs font-bold px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                              {detail.rating?.toFixed(1) || 'N/A'}/10
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{detail.reasoning}</p>
                        </div>
                      ))}
                    </div>
                    
                    {/* Team Details */}
                    <div className="border-l-4 border-purple-400 pl-3 py-1">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Team Qualifications</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic mb-2">{tender.ratingDetails.team.overallReasoning}</p>
                      
                      {tender.ratingDetails.team.details?.map((detail, index) => (
                        <div key={`team-${index}`} className="mb-2 bg-white dark:bg-gray-800 p-2 rounded-md shadow-sm">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-medium">{detail.fieldName || 'Member'}</p>
                            <span className="text-xs font-bold px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                              {detail.rating?.toFixed(1) || 'N/A'}/10
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{detail.reasoning}</p>
                        </div>
                      ))}
                    </div>
                    
                    {/* Price Details */}
                    <div className="border-l-4 border-amber-400 pl-3 py-1">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Price Evaluation</h4>
                      <div className="mb-2 bg-white dark:bg-gray-800 p-2 rounded-md shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs font-medium">Price Score</p>
                          <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-full">
                            {tender.ratingDetails.price.score.toFixed(1)}/10
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{tender.ratingDetails.price.reasoning}</p>
                      </div>
                    </div>
                 </div>
             )}
          </div>
        </div>

         {/* Reasoning Dropdown (Optional & Simplified) - Consider removing or revising */} 
         {/* This might be redundant if expansion shows details */}
         {showReasoningFeature && ( 
           <div className="w-full mt-0">
             <button 
                type="button"
                className="w-full flex justify-between items-center px-4 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-b-lg border-t border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium focus:outline-none hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-1 focus:ring-blue-300 transition group-hover:shadow-xl group-hover:border-blue-400"
                onClick={(e) => { e.stopPropagation(); setShowReasoning((v) => !v); }} 
              >
               <span>Summary Reasoning</span>
               <svg className={`w-3 h-3 transform transition-transform ${showReasoning ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
             </button>
             <div className={`transition-all duration-300 ease-in-out bg-gray-50 dark:bg-gray-700 px-4 overflow-hidden rounded-b-lg ${showReasoning ? 'max-h-40 py-2 opacity-100 border border-t-0 border-gray-200 dark:border-gray-600' : 'max-h-0 py-0 opacity-0'}`}> 
                {showReasoning && (
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {/* Display overall reasoning from rating data */}
                    Ranked {rank} with score {totalScore.toFixed(2)}. 
                    {tender.ratingDetails?.core.overallReasoning} 
                    {tender.ratingDetails?.experience.overallReasoning} 
                    {tender.ratingDetails?.team.overallReasoning} 
                    {tender.ratingDetails?.price.reasoning} 
                  </p>
                )}
             </div>
           </div>
         )} 
      </div>
    </div>
  );
};

// Main client component for the dashboard
export function DashboardClient() {
  // State for search term
  const [searchTerm, setSearchTerm] = useState<string>('');
  // State for fetched tenders (transformed from submissions)
  const [tenders, setTenders] = useState<TenderWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    const fetchCompletedSubmissions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/submissions?status=completed'); 
        if (!response.ok) {
          throw new Error(`Failed to fetch submissions: ${response.statusText}`);
        }
        const submissionsData = await response.json();
        console.log('Fetched submissions:', submissionsData);

        // Transform submissions into Tenders
        const transformedTenders = submissionsData.map((sub: Submission) => {
          if (!sub.rating_data) {
              console.warn(`Submission ${sub.submission_id} is missing rating_data.`);
              return null; // Filter out submissions without rating data
          }
          
          const ratingData = sub.rating_data;
          
          // Ensure all required sections exist
          if (!ratingData.core || !ratingData.experience || !ratingData.team || !ratingData.price) {
            console.warn(`Submission ${sub.submission_id} has incomplete rating data.`);
            return null;
          }
          
          const criteria: Criteria[] = [
            {
              id: 'core',
              name: 'Core Requirements',
              rawScore: ratingData.core.overallScore || 0,
              weight: CRITERIA_WEIGHTS.core
            },
            {
              id: 'experience',
              name: 'Experience',
              rawScore: ratingData.experience.overallScore || 0,
              weight: CRITERIA_WEIGHTS.experience
            },
            {
              id: 'team',
              name: 'Team Qualifications',
              rawScore: ratingData.team.overallScore || 0,
              weight: CRITERIA_WEIGHTS.team
            },
            {
              id: 'price',
              name: 'Price',
              rawScore: ratingData.price.score || 0, // Use the price score directly
              weight: CRITERIA_WEIGHTS.price
            },
          ];
          
          // Construct the Tender object
          const tender: TenderWithDetails = {
            id: sub.submission_id,
            bidderName: sub.company_name || `Company ${sub.submission_id.substring(0, 6)}`, // Use company name or fallback
            tenderName: sub.procurement_title || 'Unknown Tender', // Use title or fallback
            criteria: criteria,
            // Store the raw rating data for detailed display
            ratingDetails: ratingData 
          };
          return tender;
        }).filter((t: TenderWithDetails | null): t is TenderWithDetails => t !== null); // Filter out nulls

        setTenders(transformedTenders);
        console.log('Transformed tenders:', transformedTenders);

      } catch (err) {
        console.error("Error fetching submissions:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompletedSubmissions();
  }, []); // Empty dependency array means this runs once on mount

  // Recalculate stats based on the fetched 'tenders' state
  const tenderStats = useMemo(() => {
    return tenders.map(tender => ({
      tender,
      // Use overall score from ratingDetails if available, otherwise calculate
      totalScore: tender.ratingDetails?.overallScore ?? calculateTotalScore(tender),
      qualification: getQualificationStatus(tender) // Ensure this function works with the new structure
    }));
  }, [tenders]);

  // Filter tenders based on search term
  const filteredTenders = useMemo(() => {
    const baseList = tenderStats; // Use stats for filtering
    if (!searchTerm) {
      return baseList;
    }
    return baseList.filter(({ tender }) => // Filter based on tender inside stats
      (tender.bidderName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tender.tenderName?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [tenderStats, searchTerm]);

  // Separate qualified and disqualified tenders using memoized stats
  const qualifiedTenders = useMemo(() =>
      filteredTenders
          .filter(ts => ts.qualification.qualified)
          .sort((a, b) => b.totalScore - a.totalScore)
  , [filteredTenders]);

  const disqualifiedTenders = useMemo(() =>
      filteredTenders.filter(ts => !ts.qualification.qualified)
  , [filteredTenders]);

  // Loading and Error States
  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Loading submissions...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      {/* Combined View with Search and Tender Cards */} 
      <div>
          <h1 className="text-2xl font-bold mb-4">Ranked Submissions</h1>
          <input
              type="text"
              placeholder="Search by bidder or tender name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-6 p-2 border border-gray-300 dark:border-gray-600 rounded w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          
          {/* Display Ranked (Qualified) Tenders */}
          <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">Ranked Companies</h2>
              {qualifiedTenders.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No qualified companies found{searchTerm ? ' matching search' : ''}.</p>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-2">
                      {qualifiedTenders.map((ts, idx) => (
                          <TenderCard key={ts.tender.id} tender={ts.tender} rank={idx + 1} showRank={true} showReasoningFeature={true} />
                      ))}
                  </div>
              )}
          </div>

          {/* Display Unranked (Disqualified) Tenders */}
          {disqualifiedTenders.length > 0 && (
              <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-white">Unranked Companies</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-2">
                      {disqualifiedTenders.map(ts => (
                          <TenderCard key={ts.tender.id} tender={ts.tender} showRank={false} showReasoningFeature={false} />
                      ))}
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}
