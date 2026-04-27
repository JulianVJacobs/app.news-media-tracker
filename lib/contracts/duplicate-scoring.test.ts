import {
  DUPLICATE_SCORING_CONTRACT,
  DUPLICATE_SCORING_CONTRACT_VERSION,
} from './duplicate-scoring';

describe('duplicate scoring contract', () => {
  it('publishes a pinned contract version and endpoints', () => {
    expect(DUPLICATE_SCORING_CONTRACT.version).toBe(
      DUPLICATE_SCORING_CONTRACT_VERSION,
    );
    expect(DUPLICATE_SCORING_CONTRACT.endpoints).toEqual({
      duplicateDetection: '/api/articles/duplicates',
      articleCreate: '/api/articles',
    });
  });

  it('freezes explainability and weighted scoring payload fields', () => {
    expect(DUPLICATE_SCORING_CONTRACT.matchPayload.fields).toEqual([
      'id',
      'similarity',
      'matchType',
      'confidence',
      'matchReason',
      'explainability',
      'matchedFields',
      'scoring',
    ]);
    expect(DUPLICATE_SCORING_CONTRACT.matchPayload.scoringFields).toEqual([
      'whyMatched',
      'summaryRationale',
      'totalWeightedScore',
      'weightedContributions',
    ]);
    expect(
      DUPLICATE_SCORING_CONTRACT.matchPayload.weightedContributionFields,
    ).toEqual(['signal', 'weight', 'rawScore', 'weightedScore']);
  });
});
