import React from 'react';
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
    // Note: The provided sample data seems to already have the price score calculated.
    // If you need to calculate it based on the formula:
    // RCS = 10 * (1 - (Tender cost - Lowest tender) / Lowest tender)
    // Weighted Price Score = RCS * weight
    // We'll use the provided rawScore for price for now.
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


// --- Components ---

const TenderCard: React.FC<{ tender: Tender }> = ({ tender }) => {
  const totalScore = calculateTotalScore(tender);
  const { qualified, reason } = getQualificationStatus(tender);

  return (
    <div className="border rounded-lg shadow-md p-6 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow duration-200">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{tender.bidderName}</h3>
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
      <p className="text-gray-600 dark:text-gray-400 mb-4">{tender.tenderName}</p>

      {/* Display Criteria Scores (Optional - can be expanded) */}
      {/* <div className="mb-4 space-y-1">
        {tender.criteria.map(c => (
          <div key={c.id} className="text-sm text-gray-700 dark:text-gray-300">
            {c.name}: {c.rawScore.toFixed(2)} (Weighted: {calculateWeightedScore(c).toFixed(2)})
          </div>
        ))}
      </div> */}

       <div className="border-t pt-4 mt-4 dark:border-gray-700">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
              Total Score: {totalScore.toFixed(2)}
          </p>
           {!qualified && reason && (
               <p className="text-xs text-red-600 dark:text-red-400 mt-1">Reason: {reason}</p>
           )}
       </div>

    </div>
  );
};

const DashboardPage: React.FC = () => {
  // Type assertion for the imported JSON data
  const tenders = tendersData as Tender[];

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Tender Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenders.map((tender) => (
          <TenderCard key={tender.id} tender={tender} />
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
