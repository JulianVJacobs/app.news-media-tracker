/**
 * Database Utilities for Homicide Media Tracker
 *
 * This module provides utility functions for data processing,
 * article ID generation, and duplicate detection.
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

type NullableString = string | null | undefined;
type UnknownRecord = Record<string, unknown>;
type DateLike = NullableString | Date;

export type ArticleInput = UnknownRecord & {
  newsReportUrl?: NullableString;
  newsReportHeadline?: NullableString;
  author?: NullableString;
  dateOfPublication?: NullableString | Date;
};

export type VictimInput = UnknownRecord & {
  articleId?: NullableString;
  victimAlias?: NullableString;
  ageOfVictim?: number | string | null;
  dateOfDeath?: NullableString | Date;
  placeOfDeathProvince?: NullableString;
  placeOfDeathTown?: NullableString;
};

export type PerpetratorInput = UnknownRecord & {
  articleId?: NullableString;
  perpetratorName?: NullableString;
  perpetratorAlias?: NullableString;
  suspectIdentified?: NullableString;
  suspectArrested?: NullableString;
  suspectCharged?: NullableString;
  conviction?: NullableString;
  sentence?: NullableString;
};

// Supports both legacy article-level fields and richer event-level fields so
// duplicate detection can run for older payloads and relation-enriched payloads.
interface DuplicateCandidate {
  id?: string;
  newsReportUrl?: NullableString;
  newsReportHeadline?: NullableString;
  primaryName?: NullableString;
  aliases?: NullableString | NullableString[];
  participantName?: NullableString;
  participantAlias?: NullableString | NullableString[];
  victimName?: NullableString;
  victimAlias?: NullableString | NullableString[];
  dateOfDeath?: DateLike;
  placeOfDeathProvince?: NullableString;
  placeOfDeathTown?: NullableString;
  perpetratorName?: NullableString;
  perpetratorAlias?: NullableString | NullableString[];
  victims?: EventVictimCandidate[];
  perpetrators?: EventPerpetratorCandidate[];
}

interface EventVictimCandidate {
  victimName?: NullableString;
  victimAlias?: NullableString | NullableString[];
  dateOfDeath?: DateLike;
  placeOfDeathProvince?: NullableString;
  placeOfDeathTown?: NullableString;
}

interface EventPerpetratorCandidate {
  perpetratorName?: NullableString;
  perpetratorAlias?: NullableString | NullableString[];
}

interface ExportArticleRecord extends UnknownRecord {
  id?: string | null;
  articleId?: string | null;
  dateOfPublication?: NullableString | Date;
}

interface ExportVictimRecord extends UnknownRecord {
  articleId?: string | null;
}

interface ExportPerpetratorRecord extends UnknownRecord {
  articleId?: string | null;
}

interface ArticleWithRelations extends ExportArticleRecord {
  victims: ExportVictimRecord[];
  perpetrators: ExportPerpetratorRecord[];
}

interface FlattenedExportRow extends ExportArticleRecord {
  victim?: ExportVictimRecord;
  perpetrator?: ExportPerpetratorRecord;
}

/**
 * Generate unique article ID from URL, author, and title
 * This helps identify duplicate articles across different data sources
 */
export function generateArticleId(
  url: string,
  author: string,
  title: string,
): string {
  // Normalise inputs for consistent ID generation
  const normalisedUrl = url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '');
  const normalisedAuthor = author.trim().toLowerCase();
  const normalisedTitle = title.trim().toLowerCase();

  // Create hash from combined normalised data
  const combined = `${normalisedUrl}|${normalisedAuthor}|${normalisedTitle}`;
  const hash = crypto
    .createHash('sha256')
    .update(combined, 'utf8')
    .digest('hex');

  // Return first 16 characters for readability while maintaining uniqueness
  return `art_${hash.substring(0, 16)}`;
}

/**
 * Generate unique user ID
 */
export function generateUserId(): string {
  return `usr_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
}

/**
 * Validate article data before insertion
 */
export interface ArticleValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateArticleData(article: ArticleInput): ArticleValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (
    !article.newsReportUrl ||
    article.newsReportUrl.toString().trim() === ''
  ) {
    errors.push('News report URL is required');
  }

  if (
    !article.newsReportHeadline ||
    article.newsReportHeadline.toString().trim() === ''
  ) {
    errors.push('News report headline is required');
  }

  if (!article.author || article.author.toString().trim() === '') {
    warnings.push('Author is missing - this may affect duplicate detection');
  }

  // URL validation
  if (article.newsReportUrl) {
    try {
      new URL(article.newsReportUrl.toString());
    } catch {
      errors.push('News report URL is not valid');
    }
  }

  // Date validation
  if (article.dateOfPublication) {
    const date = new Date(article.dateOfPublication);
    if (isNaN(date.getTime())) {
      errors.push('Date of publication is not valid');
    }

    // Check if date is in the future
    if (date > new Date()) {
      warnings.push('Date of publication is in the future');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate victim data
 */
export function validateVictimData(victim: VictimInput): ArticleValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Age validation
  if (victim.ageOfVictim !== undefined && victim.ageOfVictim !== null) {
    const age = Number(victim.ageOfVictim);
    if (isNaN(age) || age < 0 || age > 150) {
      errors.push('Age of victim must be a valid number between 0 and 150');
    }
  }

  // Date of death validation
  if (victim.dateOfDeath) {
    const date = new Date(victim.dateOfDeath);
    if (isNaN(date.getTime())) {
      errors.push('Date of death is not valid');
    }

    // Check if date is in the future
    if (date > new Date()) {
      warnings.push('Date of death is in the future');
    }
  }

  // Required location information
  if (!victim.placeOfDeathProvince && !victim.placeOfDeathTown) {
    warnings.push(
      'Location information (province or town) would help with analysis',
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate perpetrator data
 */
export function validatePerpetratorData(
  perpetrator: PerpetratorInput,
): ArticleValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Article ID is required
  if (!perpetrator.articleId) {
    errors.push('Article ID is required');
  }

  // Suspect identification validation
  if (perpetrator.suspectIdentified === 'Yes' && !perpetrator.perpetratorName) {
    warnings.push('Suspect is identified but no name provided');
  }

  if (perpetrator.suspectIdentified === 'No' && perpetrator.perpetratorName) {
    warnings.push('Suspect marked as not identified but name is provided');
  }

  // Legal process validation
  if (
    perpetrator.suspectArrested === 'Yes' &&
    perpetrator.suspectCharged === 'No'
  ) {
    warnings.push('Suspect arrested but not charged - unusual legal process');
  }

  if (
    perpetrator.suspectCharged === 'Yes' &&
    perpetrator.suspectArrested === 'No'
  ) {
    errors.push('Suspect cannot be charged without being arrested first');
  }

  if (perpetrator.conviction === 'Yes' && perpetrator.suspectCharged === 'No') {
    errors.push('Suspect cannot be convicted without being charged first');
  }

  if (perpetrator.conviction === 'Yes' && !perpetrator.sentence) {
    warnings.push('Conviction recorded but no sentence information provided');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Detect potential duplicate articles based on similarity
 */
export interface DuplicateMatch {
  id: string;
  similarity: number;
  matchType: 'url' | 'title' | 'content' | 'name';
  confidence: 'high' | 'medium' | 'low';
  matchReason: string;
  explainability: string;
  matchedFields: string[];
  scoring: DuplicateScoringDetails;
}

export type DuplicateScoreSignal = 'url' | 'name' | 'title' | 'content';

export interface DuplicateWeightedContribution {
  signal: DuplicateScoreSignal;
  weight: number;
  rawScore: number;
  weightedScore: number;
}

export interface DuplicateScoringDetails {
  whyMatched: string[];
  summaryRationale: string;
  totalWeightedScore: number;
  weightedContributions: DuplicateWeightedContribution[];
}

type DuplicateSignalScores = Record<DuplicateScoreSignal, number>;

const DUPLICATE_SIGNAL_WEIGHTS: Record<DuplicateScoreSignal, number> = {
  url: 0.6,
  name: 0.3,
  title: 0.1,
  content: 0,
};

type EventSignalCode =
  | 'victim_name_and_date_overlap'
  | 'victim_name_and_location_match'
  | 'victim_and_suspect_name_match';

interface EventSignalHit {
  code: EventSignalCode;
  score: number;
  explainability: string;
  matchedFields: string[];
}

interface EventDuplicateMatch {
  score: number;
  confidence: DuplicateMatch['confidence'];
  matchReason: string;
  explainability: string;
  matchedFields: string[];
}

const EVENT_SIGNAL_SCORE: Record<EventSignalCode, number> = {
  // High-confidence signal: same victim plus matching/overlapping date range.
  // This should dominate medium event signals when it is present.
  victim_name_and_date_overlap: 0.8,
  // Medium-confidence signal: same victim plus matching province/town.
  victim_name_and_location_match: 0.55,
  // Medium-confidence signal: same victim plus same suspect.
  victim_and_suspect_name_match: 0.5,
};

// Threshold tuned so any medium signal can surface a candidate, while still
// avoiding weak/noisy matches.
const EVENT_DUPLICATE_SCORE_THRESHOLD = 0.5;
// Scores at/above this threshold are treated as high confidence event matches.
const EVENT_DUPLICATE_HIGH_CONFIDENCE_THRESHOLD = 0.8;
const UNKNOWN_ARTICLE_EVENT_PREFIX = 'unknown-article';

const roundScore = (value: number) => Number(value.toFixed(4));

const buildScoringDetails = (
  matchType: DuplicateMatch['matchType'],
  explainability: string,
  matchedFields: string[],
  signalScores: DuplicateSignalScores,
): DuplicateScoringDetails => {
  const weightedContributions: DuplicateWeightedContribution[] =
    Object.entries(DUPLICATE_SIGNAL_WEIGHTS).map(([signal, weight]) => {
      const typedSignal = signal as DuplicateScoreSignal;
      const rawScore = signalScores[typedSignal] ?? 0;
      return {
        signal: typedSignal,
        weight,
        rawScore: roundScore(rawScore),
        weightedScore: roundScore(rawScore * weight),
      };
    });

  const totalWeightedScore = roundScore(
    weightedContributions.reduce(
      (sum, contribution) => sum + contribution.weightedScore,
      0,
    ),
  );
  const strongestContribution = weightedContributions.reduce((best, current) =>
    current.weightedScore > best.weightedScore ? current : best,
  );
  const summaryRationale = `Primary ${matchType} signal selected with ${(
    (signalScores[matchType] ?? 0) * 100
  ).toFixed(1)}% raw similarity; strongest weighted contribution was ${
    strongestContribution.signal
  } (${(strongestContribution.weightedScore * 100).toFixed(1)}%).`;

  return {
    whyMatched: [
      explainability,
      `Matched fields: ${matchedFields.join(', ')}`,
      `Reason code: ${matchType}`,
    ],
    summaryRationale,
    totalWeightedScore,
    weightedContributions,
  };
};

type EventDateRange = {
  start: number;
  end: number;
};

type NormalisedVictimEventSignal = {
  names: Set<string>;
  dateRange?: EventDateRange;
  province: string;
  town: string;
};

const parseEventDateRange = (value: DateLike): EventDateRange | undefined => {
  if (!value) {
    return undefined;
  }

  const parseTimestamp = (entry: string): number | undefined => {
    const parsed = new Date(entry);
    const timestamp = parsed.getTime();
    return Number.isNaN(timestamp) ? undefined : timestamp;
  };

  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isNaN(timestamp)
      ? undefined
      : {
          start: timestamp,
          end: timestamp,
        };
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  // Explicitly parse ISO calendar dates (YYYY-MM-DD), including ranges that
  // contain two ISO dates in a single string.
  const isoDateMatches = trimmed.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  if (isoDateMatches.length > 0) {
    const parsedDates = isoDateMatches
      .map((entry) => parseTimestamp(entry))
      .filter((entry): entry is number => typeof entry === 'number');

    if (parsedDates.length > 0) {
      const start = Math.min(...parsedDates);
      const end = Math.max(...parsedDates);
      return { start, end };
    }
  }

  const parsed = parseTimestamp(trimmed);
  if (typeof parsed === 'number') {
    return { start: parsed, end: parsed };
  }

  return undefined;
};

const hasDateRangeOverlap = (
  source?: EventDateRange,
  target?: EventDateRange,
): boolean => {
  if (!source || !target) {
    return false;
  }

  return source.start <= target.end && target.start <= source.end;
};

const collectNormalisedVictimSignals = (
  candidate: DuplicateCandidate,
): NormalisedVictimEventSignal[] => {
  const sources: EventVictimCandidate[] = [];

  sources.push({
    victimName: candidate.victimName,
    victimAlias: candidate.victimAlias,
    dateOfDeath: candidate.dateOfDeath,
    placeOfDeathProvince: candidate.placeOfDeathProvince,
    placeOfDeathTown: candidate.placeOfDeathTown,
  });

  (candidate.victims ?? []).forEach((victim) => {
    sources.push(victim);
  });

  return sources
    .map((source) => {
      const names = new Set<string>();
      const primary = normaliseName(source.victimName);
      if (primary) {
        names.add(primary);
      }
      collectAliasValues(source.victimAlias).forEach((alias) => {
        if (alias) {
          names.add(alias);
        }
      });

      if (names.size === 0) {
        return undefined;
      }

      return {
        names,
        dateRange: parseEventDateRange(source.dateOfDeath),
        province: normaliseName(source.placeOfDeathProvince),
        town: normaliseName(source.placeOfDeathTown),
      };
    })
    .filter(
      (signal): signal is NormalisedVictimEventSignal => signal !== undefined,
    );
};

const collectNormalisedVictimNames = (candidate: DuplicateCandidate): Set<string> => {
  const names = new Set<string>();

  const addVictimValues = (source: EventVictimCandidate) => {
    const victimName = normaliseName(source.victimName);
    if (victimName) {
      names.add(victimName);
    }
    collectAliasValues(source.victimAlias).forEach((alias) => {
      if (alias) {
        names.add(alias);
      }
    });
  };

  addVictimValues({
    victimName: candidate.victimName,
    victimAlias: candidate.victimAlias,
  });

  (candidate.victims ?? []).forEach((victim) => {
    addVictimValues(victim);
  });

  return names;
};

const collectNormalisedPerpetratorNames = (
  candidate: DuplicateCandidate,
): Set<string> => {
  const names = new Set<string>();

  const addPerpetratorValues = (source: EventPerpetratorCandidate) => {
    const perpetratorName = normaliseName(source.perpetratorName);
    if (perpetratorName) {
      names.add(perpetratorName);
    }
    collectAliasValues(source.perpetratorAlias).forEach((alias) => {
      if (alias) {
        names.add(alias);
      }
    });
  };

  addPerpetratorValues({
    perpetratorName: candidate.perpetratorName,
    perpetratorAlias: candidate.perpetratorAlias,
  });

  (candidate.perpetrators ?? []).forEach((perpetrator) => {
    addPerpetratorValues(perpetrator);
  });

  return names;
};

const setsIntersect = (source: Set<string>, target: Set<string>): boolean => {
  for (const value of source) {
    if (target.has(value)) {
      return true;
    }
  }
  return false;
};

const detectEventLevelDuplicate = (
  current: DuplicateCandidate,
  existing: DuplicateCandidate,
): EventDuplicateMatch | undefined => {
  const eventSignalHits: EventSignalHit[] = [];

  const currentVictims = collectNormalisedVictimSignals(current);
  const existingVictims = collectNormalisedVictimSignals(existing);

  let hasVictimDateMatch = false;
  let hasVictimLocationMatch = false;

  for (const sourceVictim of currentVictims) {
    for (const targetVictim of existingVictims) {
      const hasVictimNameMatch = setsIntersect(sourceVictim.names, targetVictim.names);
      if (!hasVictimNameMatch) {
        continue;
      }

      if (
        !hasVictimDateMatch &&
        hasDateRangeOverlap(sourceVictim.dateRange, targetVictim.dateRange)
      ) {
        hasVictimDateMatch = true;
      }

      if (
        !hasVictimLocationMatch &&
        !!sourceVictim.province &&
        !!sourceVictim.town &&
        sourceVictim.province === targetVictim.province &&
        sourceVictim.town === targetVictim.town
      ) {
        hasVictimLocationMatch = true;
      }
    }
  }

  if (hasVictimDateMatch) {
    eventSignalHits.push({
      code: 'victim_name_and_date_overlap',
      score: EVENT_SIGNAL_SCORE.victim_name_and_date_overlap,
      explainability:
        'Victim names match and dateOfDeath values overlap (same date or overlapping date range).',
      matchedFields: ['victimName', 'dateOfDeath'],
    });
  }

  if (hasVictimLocationMatch) {
    eventSignalHits.push({
      code: 'victim_name_and_location_match',
      score: EVENT_SIGNAL_SCORE.victim_name_and_location_match,
      explainability:
        'Victim names match and placeOfDeathProvince/placeOfDeathTown values match.',
      matchedFields: ['victimName', 'placeOfDeathProvince', 'placeOfDeathTown'],
    });
  }

  const currentVictimNames = collectNormalisedVictimNames(current);
  const existingVictimNames = collectNormalisedVictimNames(existing);
  const currentPerpetratorNames = collectNormalisedPerpetratorNames(current);
  const existingPerpetratorNames = collectNormalisedPerpetratorNames(existing);

  if (
    setsIntersect(currentVictimNames, existingVictimNames) &&
    setsIntersect(currentPerpetratorNames, existingPerpetratorNames)
  ) {
    eventSignalHits.push({
      code: 'victim_and_suspect_name_match',
      score: EVENT_SIGNAL_SCORE.victim_and_suspect_name_match,
      explainability: 'Victim names and suspect names both match.',
      matchedFields: ['victimName', 'perpetratorName'],
    });
  }

  let cumulativeScore = 0;
  for (const signal of eventSignalHits) {
    cumulativeScore += signal.score;
    // Cap to 1.0 to preserve compatibility with similarity-style scoring.
    if (cumulativeScore >= 1) {
      cumulativeScore = 1;
      break;
    }
  }
  const score = roundScore(cumulativeScore);

  if (score < EVENT_DUPLICATE_SCORE_THRESHOLD) {
    return undefined;
  }

  const matchReason = eventSignalHits.map((signal) => signal.code).join(',');
  const explainability = eventSignalHits
    .map((signal) => signal.explainability)
    .join(' ');
  const matchedFields = Array.from(
    new Set(eventSignalHits.flatMap((signal) => signal.matchedFields)),
  );

  return {
    score,
    confidence:
      score >= EVENT_DUPLICATE_HIGH_CONFIDENCE_THRESHOLD ? 'high' : 'medium',
    matchReason,
    explainability,
    matchedFields,
  };
};

export function detectDuplicates(
  newArticle: DuplicateCandidate,
  existingArticles: Array<DuplicateCandidate & { id: string }>,
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];

  const newArticleUrl = newArticle.newsReportUrl
    ? newArticle.newsReportUrl.toString()
    : undefined;
  const newArticleHeadline = newArticle.newsReportHeadline
    ? newArticle.newsReportHeadline.toString()
    : undefined;

  for (const existing of existingArticles) {
    const existingArticleUrl = existing.newsReportUrl
      ? existing.newsReportUrl.toString()
      : undefined;
    const hasExactUrlMatch =
      !!newArticleUrl && !!existingArticleUrl && newArticleUrl === existingArticleUrl;
    const nameAliasMatch = getBestNameAliasMatch(newArticle, existing);
    const titleSimilarity = calculateSimilarity(
      newArticleHeadline ?? '',
      existing.newsReportHeadline?.toString() ?? '',
    );
    const signalScores: DuplicateSignalScores = {
      url: hasExactUrlMatch ? 1 : 0,
      name: nameAliasMatch?.similarity ?? 0,
      title: titleSimilarity,
      content: 0,
    };

    // Exact URL match
    if (hasExactUrlMatch) {
      const explainability = 'The newsReportUrl values are an exact match.';
      const matchedFields = ['newsReportUrl'];
      matches.push({
        id: existing.id,
        similarity: 1.0,
        matchType: 'url',
        confidence: 'high',
        matchReason: 'exact_url_match',
        explainability,
        matchedFields,
        scoring: buildScoringDetails('url', explainability, matchedFields, signalScores),
      });
      continue;
    }

    if (
      nameAliasMatch &&
      nameAliasMatch.similarity >= NAME_ALIAS_MATCH_THRESHOLD
    ) {
      const explainability = `Matched "${nameAliasMatch.newValue}" (${nameAliasMatch.newField}) with "${nameAliasMatch.existingValue}" (${nameAliasMatch.existingField}).`;
      const matchedFields = [nameAliasMatch.newField, nameAliasMatch.existingField];
      matches.push({
        id: existing.id,
        similarity: nameAliasMatch.similarity,
        matchType: 'name',
        confidence: nameAliasMatch.similarity > 0.95 ? 'high' : 'medium',
        matchReason: 'name_alias_overlap',
        explainability,
        matchedFields,
        scoring: buildScoringDetails(
          'name',
          explainability,
          matchedFields,
          signalScores,
        ),
      });
      continue;
    }

    const eventDuplicate = detectEventLevelDuplicate(newArticle, existing);
    if (eventDuplicate) {
      // Event matching folds into the existing "name" signal weight so the scoring
      // payload remains backward compatible for current DTO consumers.
      const signalScoresWithEvent: DuplicateSignalScores = {
        ...signalScores,
        name: Math.max(signalScores.name, eventDuplicate.score),
      };
      // Keep matchType as "name" to preserve the current API contract; matchReason
      // carries event-specific signal codes until a dedicated "event" type is added.
      matches.push({
        id: existing.id,
        similarity: eventDuplicate.score,
        matchType: 'name',
        confidence: eventDuplicate.confidence,
        matchReason: eventDuplicate.matchReason,
        explainability: eventDuplicate.explainability,
        matchedFields: eventDuplicate.matchedFields,
        scoring: buildScoringDetails(
          'name',
          eventDuplicate.explainability,
          eventDuplicate.matchedFields,
          signalScoresWithEvent,
        ),
      });
      continue;
    }

    if (titleSimilarity > 0.85) {
      const explainability = `The newsReportHeadline values are similar (${(
        titleSimilarity * 100
      ).toFixed(1)}%).`;
      const matchedFields = ['newsReportHeadline'];
      matches.push({
        id: existing.id,
        similarity: titleSimilarity,
        matchType: 'title',
        confidence: titleSimilarity > 0.95 ? 'high' : 'medium',
        matchReason: 'headline_similarity',
        explainability,
        matchedFields,
        scoring: buildScoringDetails(
          'title',
          explainability,
          matchedFields,
          signalScores,
        ),
      });
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}

export interface EventArticleGroup {
  eventKey: string;
  articles: ExportArticleRecord[];
  victims: ExportVictimRecord[];
  perpetrators: ExportPerpetratorRecord[];
}

export function groupArticlesByEvent(
  articles: ExportArticleRecord[],
  victims: ExportVictimRecord[],
  perpetrators: ExportPerpetratorRecord[],
): EventArticleGroup[] {
  const groupsByKey = new Map<string, EventArticleGroup>();

  for (const article of articles) {
    const candidateIds = [article.articleId, article.id].filter(
      (identifier): identifier is string =>
        typeof identifier === 'string' && identifier.length > 0,
    );
    const identifierSet = new Set(candidateIds);

    const articleVictims = victims.filter((victim) => {
      const victimArticleId = victim.articleId;
      return (
        typeof victimArticleId === 'string' && identifierSet.has(victimArticleId)
      );
    });
    const articlePerpetrators = perpetrators.filter((perpetrator) => {
      const perpetratorArticleId = perpetrator.articleId;
      return (
        typeof perpetratorArticleId === 'string' &&
        identifierSet.has(perpetratorArticleId)
      );
    });

    const eventKey = inferEventKey(article, articleVictims);
    const existingGroup = groupsByKey.get(eventKey);

    if (existingGroup) {
      existingGroup.articles.push(article);
      existingGroup.victims.push(...articleVictims);
      existingGroup.perpetrators.push(...articlePerpetrators);
      continue;
    }

    groupsByKey.set(eventKey, {
      eventKey,
      articles: [article],
      victims: [...articleVictims],
      perpetrators: [...articlePerpetrators],
    });
  }

  return Array.from(groupsByKey.values());
}

const inferEventKey = (
  article: ExportArticleRecord,
  articleVictims: ExportVictimRecord[],
): string => {
  const primaryVictim = articleVictims.find((victim) => {
    const victimName = victim['victimName'];
    return typeof victimName === 'string' && victimName.trim().length > 0;
  });

  const victimName = normaliseName(
    (primaryVictim?.['victimName'] as NullableString) ?? undefined,
  );
  const province = normaliseName(
    (primaryVictim?.['placeOfDeathProvince'] as NullableString) ?? undefined,
  );
  const town = normaliseName(
    (primaryVictim?.['placeOfDeathTown'] as NullableString) ?? undefined,
  );
  const dateBucket = buildApproximateDateBucket(
    primaryVictim?.['dateOfDeath'] as DateLike,
  );
  const fallbackId = buildArticleFallbackEventToken(article);

  if (!victimName) {
    return `article:${fallbackId}`;
  }
  const locationKnown = !!province && !!town;
  const locationToken = locationKnown
    ? `${province}|${town}`
    : `unknown-location|${fallbackId}`;

  return [victimName, dateBucket, locationToken].join('|').toLowerCase();
};

const buildArticleFallbackEventToken = (article: ExportArticleRecord): string => {
  const candidateValues = [
    article.id,
    article.articleId,
    article['newsReportUrl'],
    article['newsReportHeadline'],
  ];
  const explicitIdentifier = candidateValues.find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );

  if (explicitIdentifier) {
    return explicitIdentifier;
  }

  const fingerprint = JSON.stringify(article);
  const digest = crypto
    .createHash('sha256')
    .update(fingerprint, 'utf8')
    .digest('hex')
    .slice(0, 12);

  return `${UNKNOWN_ARTICLE_EVENT_PREFIX}:${digest}`;
};

const buildApproximateDateBucket = (value: DateLike): string => {
  const range = parseEventDateRange(value);
  if (!range) {
    return 'unknown-date';
  }

  const startDate = new Date(range.start);
  const year = startDate.getUTCFullYear();
  const month = `${startDate.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${startDate.getUTCDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

type CandidateName = {
  value: string;
  field: string;
  isAlias: boolean;
};

const NAME_ALIAS_MATCH_THRESHOLD = 0.9;
const ALIAS_EXACT_MATCH_SCORE = 0.95;
const NAME_EXACT_MATCH_SCORE = 0.98;

const normaliseName = (value: NullableString): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
};

const collectAliasValues = (
  value: NullableString | NullableString[] | undefined,
): string[] => {
  const splitAndNormalise = (entry: string): string[] =>
    entry
      .split(',')
      .map((item) => normaliseName(item))
      .filter(Boolean);

  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      typeof item === 'string' ? splitAndNormalise(item) : [],
    );
  }

  if (typeof value === 'string') {
    return splitAndNormalise(value);
  }

  return [];
};

const collectCandidateNames = (candidate: DuplicateCandidate): CandidateName[] => {
  const names: CandidateName[] = [];
  const seenByField = new Map<string, Set<string>>();

  const addName = (value: NullableString, field: string, isAlias: boolean) => {
    const normalised = normaliseName(value);
    if (!normalised) {
      return;
    }
    const seenForField = seenByField.get(field) ?? new Set<string>();
    if (seenForField.has(normalised)) {
      return;
    }
    seenForField.add(normalised);
    seenByField.set(field, seenForField);
    names.push({
      value: normalised,
      field,
      isAlias,
    });
  };

  addName(candidate.primaryName, 'primaryName', false);
  addName(candidate.participantName, 'participantName', false);
  addName(candidate.victimName, 'victimName', false);
  addName(candidate.perpetratorName, 'perpetratorName', false);

  collectAliasValues(candidate.aliases).forEach((alias) => {
    addName(alias, 'aliases', true);
  });
  collectAliasValues(candidate.participantAlias).forEach((alias) => {
    addName(alias, 'participantAlias', true);
  });
  collectAliasValues(candidate.victimAlias).forEach((alias) => {
    addName(alias, 'victimAlias', true);
  });
  collectAliasValues(candidate.perpetratorAlias).forEach((alias) => {
    addName(alias, 'perpetratorAlias', true);
  });

  return names;
};

const getBestNameAliasMatch = (
  current: DuplicateCandidate,
  existing: DuplicateCandidate,
):
  | {
      similarity: number;
      newValue: string;
      existingValue: string;
      newField: string;
      existingField: string;
    }
  | undefined => {
  const currentNames = collectCandidateNames(current);
  const existingNames = collectCandidateNames(existing);

  let best:
    | {
        similarity: number;
        newValue: string;
        existingValue: string;
        newField: string;
        existingField: string;
      }
    | undefined;

  for (const source of currentNames) {
    for (const target of existingNames) {
      const similarity = calculateNameSimilarity(source, target);

      if (!best || similarity > best.similarity) {
        best = {
          similarity,
          newValue: source.value,
          existingValue: target.value,
          newField: source.field,
          existingField: target.field,
        };
      }
    }
  }

  return best;
};

const calculateNameSimilarity = (
  source: CandidateName,
  target: CandidateName,
): number => {
  if (source.value === target.value) {
    // Keep exact name/alias matches below URL certainty (1.0) so URL matches stay
    // the strongest signal while still returning high-confidence merge candidates.
    if (source.isAlias || target.isAlias) {
      return ALIAS_EXACT_MATCH_SCORE;
    }
    return NAME_EXACT_MATCH_SCORE;
  }
  return calculateSimilarity(source.value, target.value);
};

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  // Initialise matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLength = Math.max(len1, len2);

  return 1 - distance / maxLength;
}

/**
 * Normalise data for consistency
 */
export function normaliseData<T extends UnknownRecord>(data: T): T {
  const normalised: UnknownRecord = { ...data };

  // Normalise strings
  for (const key of Object.keys(normalised)) {
    const value = normalised[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      normalised[key] = trimmed === '' ? null : trimmed;
    }
  }

  // Normalise dates to ISO format
  if ('dateOfPublication' in normalised) {
    const value = normalised['dateOfPublication'];
    if (value) {
      try {
        const parsed =
          value instanceof Date ? value : new Date(value as string);
        normalised['dateOfPublication'] = parsed.toISOString();
      } catch {
        normalised['dateOfPublication'] = null;
      }
    }
  }

  if ('dateOfDeath' in normalised) {
    const value = normalised['dateOfDeath'];
    if (value) {
      try {
        const parsed =
          value instanceof Date ? value : new Date(value as string);
        normalised['dateOfDeath'] = parsed.toISOString();
      } catch {
        normalised['dateOfDeath'] = null;
      }
    }
  }

  return normalised as T;
}

/**
 * Export data to various formats
 */
export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  includeMetadata: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: {
    province?: string;
    modeOfDeath?: string;
    suspectArrested?: boolean;
  };
}

export async function exportData(
  articles: ExportArticleRecord[],
  victims: ExportVictimRecord[],
  perpetrators: ExportPerpetratorRecord[],
  options: ExportOptions,
): Promise<string> {
  // Filter data based on options
  let filteredArticles = articles;

  if (options.dateRange) {
    const { start, end } = options.dateRange;
    filteredArticles = articles.filter((article) => {
      const rawDate = article.dateOfPublication;
      if (!rawDate) {
        return false;
      }

      const publicationDate =
        rawDate instanceof Date ? rawDate : new Date(String(rawDate));
      if (Number.isNaN(publicationDate.valueOf())) {
        return false;
      }

      return publicationDate >= start && publicationDate <= end;
    });
  }

  // Combine data for export
  const exportRows: ArticleWithRelations[] = filteredArticles.map((article) => {
    const candidateIds = [article.articleId, article.id].filter(
      (identifier): identifier is string =>
        typeof identifier === 'string' && identifier.length > 0,
    );
    const identifierSet = new Set(candidateIds);

    const articleVictims = victims.filter((victim) => {
      const victimArticleId = victim.articleId;
      if (typeof victimArticleId !== 'string') {
        return false;
      }
      return identifierSet.has(victimArticleId);
    });

    const articlePerpetrators = perpetrators.filter((perpetrator) => {
      const perpetratorArticleId = perpetrator.articleId;
      if (typeof perpetratorArticleId !== 'string') {
        return false;
      }
      return identifierSet.has(perpetratorArticleId);
    });

    return {
      ...article,
      victims: articleVictims,
      perpetrators: articlePerpetrators,
    };
  });

  switch (options.format) {
    case 'json':
      return JSON.stringify(exportRows, null, 2);

    case 'csv':
      // Flatten data for CSV export
      return exportToCsv(exportRows);

    case 'xlsx':
      // This would require additional Excel library implementation
      throw new Error('XLSX export not implemented yet');

    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}

/**
 * Convert data to CSV format
 */
function exportToCsv(data: ArticleWithRelations[]): string {
  if (data.length === 0) return '';

  // Flatten the nested structure
  const flattened: FlattenedExportRow[] = data.flatMap((article) => {
    if (article.victims.length === 0 && article.perpetrators.length === 0) {
      return [{ ...article, victims: [], perpetrators: [] }];
    }

    const rows: FlattenedExportRow[] = [];
    const maxRows = Math.max(
      article.victims.length,
      article.perpetrators.length,
      1,
    );

    for (let i = 0; i < maxRows; i += 1) {
      rows.push({
        ...article,
        victim: article.victims[i],
        perpetrator: article.perpetrators[i],
      });
    }

    return rows;
  });

  // Get all unique keys for CSV headers
  const keys = new Set<string>();
  flattened.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!['victims', 'perpetrators', 'victim', 'perpetrator'].includes(key)) {
        keys.add(key);
      }
    });

    if (row.victim) {
      Object.keys(row.victim).forEach((key) => keys.add(`victim_${key}`));
    }

    if (row.perpetrator) {
      Object.keys(row.perpetrator).forEach((key) =>
        keys.add(`perpetrator_${key}`),
      );
    }
  });

  const headers = Array.from(keys).sort();
  const csvRows = [headers.join(',')];

  // Convert rows to CSV
  flattened.forEach((row) => {
    const values = headers.map((header) => {
      let value: unknown;

      if (header.startsWith('victim_')) {
        const key = header.replace('victim_', '');
        value = row.victim?.[key];
      } else if (header.startsWith('perpetrator_')) {
        const key = header.replace('perpetrator_', '');
        value = row.perpetrator?.[key];
      } else {
        value = row[header];
      }

      if (typeof value === 'string') {
        if (value.includes(',') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }

      if (value === null || value === undefined) {
        return '';
      }

      return String(value);
    });

    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}

/**
 * sanitise data for safe storage
 */
export function sanitiseData<T extends Record<string, unknown>>(data: T): T {
  const sanitisedEntries = Object.entries(data).map(([key, value]) => {
    if (typeof value !== 'string') return [key, value];

    const cleaned = value
      .replace(/<script[^>]*>.*<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');

    return [key, cleaned];
  });

  return Object.fromEntries(sanitisedEntries) as T;
}
