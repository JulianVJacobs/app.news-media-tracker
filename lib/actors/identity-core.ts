import {
  joinAliases,
  mergeAliasValues,
  splitAliases,
} from '../../app/api/participant/[role]/utils';

export interface ActorIdentifierValue {
  namespace: string;
  value: string;
}

export interface ActorIdentityRecord {
  id: string;
  canonicalLabel: string | null;
  actorKind?: string | null;
  aliases?: string[] | string | null;
  identifiers?: ActorIdentifierValue[];
}

export interface ActorAliasPromotionResult {
  canonicalLabel: string;
  aliases: string[];
}

export interface ActorCandidateScoreBreakdown {
  field: 'canonicalLabel' | 'aliases' | 'identifiers' | 'actorKind';
  score: number;
  maxScore: number;
  matches: string[];
}

export interface ActorDuplicateCandidate {
  id: string;
  left: ActorIdentityRecord;
  right: ActorIdentityRecord;
  score: number;
  breakdown: ActorCandidateScoreBreakdown[];
}

const SCORE_WEIGHTS = {
  canonicalLabel: 0.45,
  aliases: 0.3,
  identifiers: 0.2,
  actorKind: 0.05,
} as const;

const normalise = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const splitActorAliases = (aliases: ActorIdentityRecord['aliases']): string[] =>
  Array.isArray(aliases)
    ? splitAliases(joinAliases(aliases) ?? null)
    : splitAliases(aliases ?? null);

const toNameSet = (actor: ActorIdentityRecord): Set<string> => {
  const set = new Set<string>();
  const canonical = normalise(actor.canonicalLabel);
  if (canonical) {
    set.add(canonical);
  }
  splitActorAliases(actor.aliases)
    .map((value) => normalise(value))
    .filter(Boolean)
    .forEach((value) => set.add(value));
  return set;
};

const toIdentifierSet = (actor: ActorIdentityRecord): Set<string> => {
  const set = new Set<string>();
  (actor.identifiers ?? []).forEach((identifier) => {
    const namespace = normalise(identifier.namespace);
    const value = normalise(identifier.value);
    if (!namespace || !value) return;
    set.add(`${namespace}:${value}`);
  });
  return set;
};

const getIntersection = (left: Set<string>, right: Set<string>): string[] =>
  Array.from(left).filter((value) => right.has(value));

const scoreOverlap = (
  left: Set<string>,
  right: Set<string>,
  maxScore: number,
): { score: number; matches: string[] } => {
  if (left.size === 0 || right.size === 0) {
    return { score: 0, matches: [] };
  }
  const matches = getIntersection(left, right);
  if (matches.length === 0) {
    return { score: 0, matches: [] };
  }
  const denominator = Math.min(left.size, right.size);
  const ratio = matches.length / denominator;
  return { score: Number((maxScore * ratio).toFixed(4)), matches };
};

export const buildActorAliasPromotionResult = (
  actor: ActorIdentityRecord,
  promotedAlias: string,
): ActorAliasPromotionResult => {
  const nextPrimary = promotedAlias.trim();
  if (!nextPrimary) {
    throw new Error('Select an alias value to promote.');
  }

  const aliases = splitActorAliases(actor.aliases);
  const aliasLookup = new Set(aliases.map((alias) => alias.toLowerCase()));
  if (!aliasLookup.has(nextPrimary.toLowerCase())) {
    throw new Error('Selected value must be an existing alias.');
  }

  const merged = mergeAliasValues(
    joinAliases(aliases),
    actor.canonicalLabel ? [actor.canonicalLabel] : [],
    [nextPrimary],
  );

  return {
    canonicalLabel: nextPrimary,
    aliases: splitAliases(merged),
  };
};

export const scoreActorDuplicateCandidate = (
  left: ActorIdentityRecord,
  right: ActorIdentityRecord,
): { score: number; breakdown: ActorCandidateScoreBreakdown[] } => {
  const leftCanonical = normalise(left.canonicalLabel);
  const rightCanonical = normalise(right.canonicalLabel);
  const canonicalMatch =
    leftCanonical && rightCanonical && leftCanonical === rightCanonical;

  const aliasScore = scoreOverlap(toNameSet(left), toNameSet(right), SCORE_WEIGHTS.aliases);
  const identifierScore = scoreOverlap(
    toIdentifierSet(left),
    toIdentifierSet(right),
    SCORE_WEIGHTS.identifiers,
  );
  const kindMatch =
    normalise(left.actorKind) &&
    normalise(right.actorKind) &&
    normalise(left.actorKind) === normalise(right.actorKind);

  const breakdown: ActorCandidateScoreBreakdown[] = [
    {
      field: 'canonicalLabel',
      score: canonicalMatch ? SCORE_WEIGHTS.canonicalLabel : 0,
      maxScore: SCORE_WEIGHTS.canonicalLabel,
      matches: canonicalMatch && left.canonicalLabel ? [left.canonicalLabel] : [],
    },
    {
      field: 'aliases',
      score: aliasScore.score,
      maxScore: SCORE_WEIGHTS.aliases,
      matches: aliasScore.matches,
    },
    {
      field: 'identifiers',
      score: identifierScore.score,
      maxScore: SCORE_WEIGHTS.identifiers,
      matches: identifierScore.matches,
    },
    {
      field: 'actorKind',
      score: kindMatch ? SCORE_WEIGHTS.actorKind : 0,
      maxScore: SCORE_WEIGHTS.actorKind,
      matches: kindMatch && left.actorKind ? [left.actorKind] : [],
    },
  ];

  const score = Number(
    Math.min(1, breakdown.reduce((sum, entry) => sum + entry.score, 0)).toFixed(4),
  );

  return { score, breakdown };
};

export const buildActorDuplicateCandidates = (
  actors: ActorIdentityRecord[],
  minimumScore = 0.4,
): ActorDuplicateCandidate[] => {
  const candidates: ActorDuplicateCandidate[] = [];
  for (let leftIndex = 0; leftIndex < actors.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < actors.length; rightIndex += 1) {
      const left = actors[leftIndex];
      const right = actors[rightIndex];
      const result = scoreActorDuplicateCandidate(left, right);
      if (result.score < minimumScore) continue;
      candidates.push({
        id: [left.id, right.id].sort().join('::'),
        left,
        right,
        score: result.score,
        breakdown: result.breakdown,
      });
    }
  }
  return candidates.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
};
