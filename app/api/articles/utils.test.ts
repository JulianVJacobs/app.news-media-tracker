import { mapDuplicateMatchDtos } from './utils';

describe('article duplicate match DTO mapper', () => {
  it('maps explainable scoring payload fields without dropping compatibility fields', () => {
    const mapped = mapDuplicateMatchDtos([
      {
        id: 'article-1',
        similarity: 0.98,
        matchType: 'name',
        confidence: 'high',
        matchReason: 'name_alias_overlap',
        explainability: 'Matched values.',
        matchedFields: ['primaryName', 'aliases'],
        scoring: {
          whyMatched: ['Matched values.', 'Matched fields: primaryName, aliases'],
          summaryRationale: 'Primary name signal selected.',
          totalWeightedScore: 0.52,
          weightedContributions: [
            { signal: 'url', weight: 0.6, rawScore: 0, weightedScore: 0 },
            { signal: 'name', weight: 0.3, rawScore: 0.98, weightedScore: 0.294 },
            { signal: 'title', weight: 0.1, rawScore: 0.22, weightedScore: 0.022 },
          ],
        },
      },
    ]);

    expect(mapped).toEqual([
      {
        id: 'article-1',
        similarity: 0.98,
        matchType: 'name',
        confidence: 'high',
        matchReason: 'name_alias_overlap',
        explainability: 'Matched values.',
        matchedFields: ['primaryName', 'aliases'],
        scoring: {
          whyMatched: ['Matched values.', 'Matched fields: primaryName, aliases'],
          summaryRationale: 'Primary name signal selected.',
          totalWeightedScore: 0.52,
          weightedContributions: [
            { signal: 'url', weight: 0.6, rawScore: 0, weightedScore: 0 },
            { signal: 'name', weight: 0.3, rawScore: 0.98, weightedScore: 0.294 },
            { signal: 'title', weight: 0.1, rawScore: 0.22, weightedScore: 0.022 },
          ],
        },
      },
    ]);
  });
});
