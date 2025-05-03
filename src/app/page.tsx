"use client";
import React, { useState, useMemo } from 'react';
import tendersData from '@/data/tenders.json';

// Define interfaces for better type safety
interface Criteria {
  id: string;
  name: string;
  type: 'price' | 'qualitative';
  weight: number; // Percentage (e.g., 35 for 35%)
  rawScore: number; // Score out of 10
}

interface Tender {
  id: string;
  bidderName: string;
  tenderName: string;
  price: number;
  lowestTenderPrice: number; // Needed for price score calculation if using formula
  criteria: Criteria[];
}

// --- Calculation Functions ---

// Calculate Weighted Score for a single criterion
const calculateWeightedScore = (criterion: Criteria): number => {
  return criterion.rawScore * (criterion.weight / 100);
};

// Calculate Total Score for a tender
const calculateTotalScore = (tender: Tender): number => {
  return tender.criteria.reduce((sum, criterion) => {
    // RCS = 10 * (1 - (Tender cost - Lowest tender) / Lowest tender)
    // Weighted Price Score = RCS * weight
    return sum + calculateWeightedScore(criterion);
  }, 0);
};

// Determine Qualification Status
const getQualificationStatus = (tender: Tender): { qualified: boolean; reason?: string } => {
  let totalQualitativeWeight = 0;
  let totalAchievedQualitativeScore = 0;
  let lowestIndividualQualitativeScore = 10; // Start high
  let failsIndividualCriteria = false;

  tender.criteria.forEach(criterion => {
    if (criterion.type === 'qualitative') {
      totalQualitativeWeight += criterion.weight;
      totalAchievedQualitativeScore += calculateWeightedScore(criterion);

      // Check individual qualitative score (assuming rawScore is out of 10)
      if (criterion.rawScore < 6) { // Less than 60% (6 out of 10)
          failsIndividualCriteria = true;
          lowestIndividualQualitativeScore = Math.min(lowestIndividualQualitativeScore, criterion.rawScore);
      }
    }
  });

  // Max possible qualitative score = total qualitative weight (since raw score max is 10)
  const maxPossibleQualitativeScore = totalQualitativeWeight;
  const achievedQualitativePercentage = (totalAchievedQualitativeScore / maxPossibleQualitativeScore) * 100;


  if (achievedQualitativePercentage < 70) {
    return { qualified: false, reason: `Qualitative score ${achievedQualitativePercentage.toFixed(1)}% < 70%` };
  }

  if (failsIndividualCriteria) {
      return { qualified: false, reason: `Individual qualitative score ${lowestIndividualQualitativeScore}/10 < 6/10` };
  }

  return { qualified: true };
};

const getProgressBarColor = (qualified: boolean, percent: number) => {
  if (!qualified) return 'bg-red-500';
  if (percent >= 85) return 'bg-green-500';
  return 'bg-yellow-400';
};

// --- Components ---

const TenderCard: React.FC<{ tender: Tender; rank?: number; showRank?: boolean; showReasoningFeature?: boolean }> = ({ tender, rank, showRank = true, showReasoningFeature = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const totalScore = calculateTotalScore(tender);
  const { qualified, reason } = getQualificationStatus(tender);
  // Assume max score is 10 (rawScore) * 100% (all weights sum to 100)
  const percent = Math.min((totalScore / 10) * 10, 100); // totalScore out of 10, scale to 100
  const progressBarColor = getProgressBarColor(qualified, percent);

  return (
    <div className="mb-4 flex items-start">
      {/* Ranking Number */}
      {showRank && (
        <div className="flex-shrink-0 mr-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg text-white text-xl font-bold border-4 border-white dark:border-gray-800 select-none">
            {rank}
          </div>
        </div>
      )}
      <div className="flex-1">
        <div
          className={`border rounded-lg shadow-md p-4 bg-white dark:bg-gray-800 transition-all duration-700 ease-in-out ${isExpanded ? 'max-h-[500px]' : 'max-h-32'} overflow-hidden cursor-pointer hover:scale-[1.03] hover:shadow-xl hover:border-blue-400`}
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ transition: 'box-shadow 0.9s cubic-bezier(0.4,0,0.2,1), transform 0.9s cubic-bezier(0.4,0,0.2,1), border-color 0.9s, max-height 0.7s cubic-bezier(0.4,0,0.2,1)' }}
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{tender.bidderName}</h3>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                qualified
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
              }`}
            >
              {qualified ? 'Qualified' : 'Disqualified'}
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{tender.tenderName}</p>

          {/* Progress Bar */}
          <div className="mt-3 mb-1">
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-3 ${progressBarColor} transition-all duration-700`}
                style={{ width: `${percent}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-300 mt-1 text-right">
              {percent.toFixed(1)}%
            </div>
          </div>

          <div
            className={`transition-all duration-700 ease-in-out ${isExpanded ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'} mt-4`}
            style={{
              transition: 'opacity 0.7s cubic-bezier(0.4,0,0.2,1), transform 0.7s cubic-bezier(0.4,0,0.2,1)'
            }}
            aria-hidden={!isExpanded}
          >
            {isExpanded && (
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Total Score: {totalScore.toFixed(2)}</p>
                {!qualified && reason && (
                  <p className="text-xs text-red-600 dark:text-red-400">Reason: {reason}</p>
                )}
                <div className="mt-2 space-y-1">
                  {tender.criteria.map(c => (
                    <div key={c.id} className="text-sm text-gray-700 dark:text-gray-300">
                      {c.name}: {c.rawScore.toFixed(2)} (Weighted: {calculateWeightedScore(c).toFixed(2)})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Reasoning for Ranking Dropdown */}
        {showReasoningFeature && (
          <div className="w-full mt-2">
            <button
              type="button"
              className="w-full flex justify-between items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-b-lg border-t border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              onClick={() => setShowReasoning((v) => !v)}
            >
              <span>Reasoning for Ranking</span>
              <svg
                className={`w-4 h-4 ml-2 transform transition-transform duration-300 ${showReasoning ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              className={`transition-all duration-500 ease-in-out bg-gray-50 dark:bg-gray-800 px-4 overflow-hidden ${showReasoning ? 'max-h-40 py-3 opacity-100' : 'max-h-0 py-0 opacity-0'}`}
              style={{ borderBottomLeftRadius: '0.75rem', borderBottomRightRadius: '0.75rem' }}
            >
              {showReasoning && (
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  This section can be used to explain why this tender received its ranking. You can customize this content as needed.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DashboardPage: React.FC = () => {
  // Type assertion for the imported JSON data
  const tenders = (tendersData as Tender[]);

  // Memoize qualification status and total score for each tender
  const tenderStats = useMemo(() => {
    return tenders.map(tender => ({
      tender,
      totalScore: calculateTotalScore(tender),
      qualification: getQualificationStatus(tender)
    }));
  }, [tenders]);

  // Separate qualified and disqualified tenders using memoized stats
  const qualifiedTenders = tenderStats
    .filter(ts => ts.qualification.qualified)
    .sort((a, b) => b.totalScore - a.totalScore);
  const disqualifiedTenders = tenderStats.filter(ts => !ts.qualification.qualified);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Tender Dashboard</h1>
      {/* Ranked (Qualified) Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">Ranked Companies</h2>
        {qualifiedTenders.length === 0 ? (
          <div className="text-center text-gray-400 text-base py-8">There is Currently NO Qualified Companies to be Ranked.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {qualifiedTenders.map((ts, idx) => (
              <TenderCard key={ts.tender.id} tender={ts.tender} rank={idx + 1} showRank={true} showReasoningFeature={true} />
            ))}
          </div>
        )}
      </div>
      {/* Unranked (Disqualified) Section */}
      {disqualifiedTenders.length > 0 && (
        <div className="mt-10">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">Unranked (Disqualified) Companies</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {disqualifiedTenders.map(ts => (
              <TenderCard key={ts.tender.id} tender={ts.tender} showRank={false} showReasoningFeature={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;