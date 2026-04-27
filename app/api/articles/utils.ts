import type { Article } from '../../../lib/db/schema';
import type { DuplicateMatch } from '../../../lib/components/utils';
import type { DuplicateMatchDto } from '../../../lib/contracts/duplicate-scoring';
import {
  toNullableIsoString,
  toNullableString,
} from '../../../lib/utils/coercion';

const coreFields: ArticleCoreFields[] = [
  'newsReportId',
  'newsReportUrl',
  'newsReportHeadline',
  'dateOfPublication',
  'author',
  'wireService',
  'language',
  'typeOfSource',
  'newsReportPlatform',
  'notes',
];

type ArticleCoreFields =
  | 'newsReportId'
  | 'newsReportUrl'
  | 'newsReportHeadline'
  | 'dateOfPublication'
  | 'author'
  | 'wireService'
  | 'language'
  | 'typeOfSource'
  | 'newsReportPlatform'
  | 'notes';

export type ArticleCore = Pick<Article, ArticleCoreFields>;

const fieldTransformers: Record<
  ArticleCoreFields,
  (value: unknown, fallback: string | null) => string | null
> = {
  newsReportId: toNullableString,
  newsReportUrl: toNullableString,
  newsReportHeadline: toNullableString,
  dateOfPublication: toNullableIsoString,
  author: toNullableString,
  wireService: toNullableString,
  language: toNullableString,
  typeOfSource: toNullableString,
  newsReportPlatform: toNullableString,
  notes: toNullableString,
};

export const coerceArticle = (
  data: Record<string, unknown>,
  current?: Article,
): ArticleCore => {
  const result = {} as ArticleCore;

  for (const field of coreFields) {
    const transform = fieldTransformers[field];
    const fallback = current?.[field] ?? null;
    result[field] = transform(data[field], fallback);
  }

  return result;
};

export const mapDuplicateMatchDto = (match: DuplicateMatch): DuplicateMatchDto => ({
  id: match.id,
  similarity: match.similarity,
  matchType: match.matchType,
  confidence: match.confidence,
  matchReason: match.matchReason,
  explainability: match.explainability,
  matchedFields: [...match.matchedFields],
  scoring: {
    whyMatched: [...match.scoring.whyMatched],
    summaryRationale: match.scoring.summaryRationale,
    totalWeightedScore: match.scoring.totalWeightedScore,
    weightedContributions: match.scoring.weightedContributions.map(
      (contribution) => ({
        signal: contribution.signal,
        weight: contribution.weight,
        rawScore: contribution.rawScore,
        weightedScore: contribution.weightedScore,
      }),
    ),
  },
});

export const mapDuplicateMatchDtos = (
  matches: DuplicateMatch[],
): DuplicateMatchDto[] => matches.map(mapDuplicateMatchDto);
