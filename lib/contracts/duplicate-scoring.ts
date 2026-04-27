export const DUPLICATE_SCORING_CONTRACT_VERSION = '2026-04-20';

export type DuplicateScoreSignal = 'url' | 'name' | 'title' | 'content';

export interface DuplicateWeightedContributionDto {
  signal: DuplicateScoreSignal;
  weight: number;
  rawScore: number;
  weightedScore: number;
}

export interface DuplicateScoringDto {
  whyMatched: string[];
  summaryRationale: string;
  totalWeightedScore: number;
  weightedContributions: DuplicateWeightedContributionDto[];
}

export interface DuplicateMatchDto {
  id: string;
  similarity: number;
  matchType: 'url' | 'title' | 'content' | 'name';
  confidence: 'high' | 'medium' | 'low';
  matchReason: string;
  explainability: string;
  matchedFields: string[];
  scoring: DuplicateScoringDto;
}

export const DUPLICATE_SCORING_CONTRACT = {
  version: DUPLICATE_SCORING_CONTRACT_VERSION,
  endpoints: {
    duplicateDetection: '/api/articles/duplicates',
    articleCreate: '/api/articles',
  },
  matchPayload: {
    fields: [
      'id',
      'similarity',
      'matchType',
      'confidence',
      'matchReason',
      'explainability',
      'matchedFields',
      'scoring',
    ],
    scoringFields: [
      'whyMatched',
      'summaryRationale',
      'totalWeightedScore',
      'weightedContributions',
    ],
    weightedContributionFields: ['signal', 'weight', 'rawScore', 'weightedScore'],
  },
} as const;
