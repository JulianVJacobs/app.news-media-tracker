export type MergeParticipantRole = 'victim' | 'perpetrator';

export interface MergeParticipantRecord {
  id: string;
  role: MergeParticipantRole;
  articleId: string;
  primaryName: string | null;
  alias: string | null;
}

export interface MergeQueueCandidate {
  id: string;
  sharedValue: string;
  left: MergeParticipantRecord;
  right: MergeParticipantRecord;
}

export type MergeQueueRoleFilter = 'all' | MergeParticipantRole;
export type MergeQueueSortOrder =
  | 'shared-value-asc'
  | 'shared-value-desc'
  | 'role-asc'
  | 'role-desc';

const NAME_DELIMITER = /[,;|]+/;

export const normaliseName = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export const splitAliasValues = (alias: string | null | undefined): string[] =>
  typeof alias === 'string' && alias.trim()
    ? alias
        .split(NAME_DELIMITER)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

export const uniqueNames = (names: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const values: string[] = [];
  names.forEach((name) => {
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      values.push(trimmed);
    }
  });
  return values;
};

const candidateNames = (participant: MergeParticipantRecord): string[] => {
  return uniqueNames([participant.primaryName, ...splitAliasValues(participant.alias)]);
};

const sharedName = (
  left: MergeParticipantRecord,
  right: MergeParticipantRecord,
): string | null => {
  const rightSet = new Set(candidateNames(right).map((value) => value.toLowerCase()));
  for (const value of candidateNames(left)) {
    if (rightSet.has(value.toLowerCase())) {
      return value;
    }
  }
  return null;
};

export const buildMergeQueueCandidates = (
  participants: MergeParticipantRecord[],
): MergeQueueCandidate[] => {
  const candidates: MergeQueueCandidate[] = [];
  for (let leftIndex = 0; leftIndex < participants.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < participants.length;
      rightIndex += 1
    ) {
      const left = participants[leftIndex];
      const right = participants[rightIndex];
      if (left.role !== right.role) continue;
      const sharedValue = sharedName(left, right);
      if (!sharedValue) continue;
      candidates.push({
        id: [left.id, right.id].sort().join('::'),
        left,
        right,
        sharedValue,
      });
    }
  }
  return candidates;
};

const candidateMatchesSearch = (
  candidate: MergeQueueCandidate,
  searchTerm: string,
): boolean => {
  if (!searchTerm) return true;
  const values = [
    candidate.sharedValue,
    candidate.left.primaryName,
    candidate.left.alias,
    candidate.right.primaryName,
    candidate.right.alias,
    candidate.left.id,
    candidate.right.id,
  ];
  return values.some((value) => normaliseName(value).includes(searchTerm));
};

export const filterAndSortMergeQueueCandidates = (
  queue: MergeQueueCandidate[],
  options: {
    roleFilter: MergeQueueRoleFilter;
    searchText: string;
    sortOrder: MergeQueueSortOrder;
  },
): MergeQueueCandidate[] => {
  const searchTerm = normaliseName(options.searchText);
  const filtered = queue.filter((candidate) => {
    if (
      options.roleFilter !== 'all' &&
      candidate.left.role !== options.roleFilter
    ) {
      return false;
    }
    return candidateMatchesSearch(candidate, searchTerm);
  });

  return filtered.sort((left, right) => {
    if (options.sortOrder === 'role-asc' || options.sortOrder === 'role-desc') {
      const direction = options.sortOrder === 'role-asc' ? 1 : -1;
      const roleCompare = left.left.role.localeCompare(right.left.role);
      if (roleCompare !== 0) return roleCompare * direction;
      const sharedCompare = normaliseName(left.sharedValue).localeCompare(
        normaliseName(right.sharedValue),
      );
      if (sharedCompare !== 0) return sharedCompare * direction;
      return left.id.localeCompare(right.id) * direction;
    }

    const direction = options.sortOrder === 'shared-value-asc' ? 1 : -1;
    const sharedCompare = normaliseName(left.sharedValue).localeCompare(
      normaliseName(right.sharedValue),
    );
    if (sharedCompare !== 0) return sharedCompare * direction;
    return left.id.localeCompare(right.id) * direction;
  });
};

export interface AliasPromotionResult {
  primaryName: string;
  alias: string | null;
}

export const buildAliasPromotionResult = (
  participant: MergeParticipantRecord,
  promotedName: string,
): AliasPromotionResult => {
  const nextPrimary = promotedName.trim();
  if (!nextPrimary) {
    throw new Error('Select an alias value to promote.');
  }
  if (normaliseName(nextPrimary) === normaliseName(participant.primaryName)) {
    throw new Error('Selected alias already matches the primary name.');
  }

  const aliases = splitAliasValues(participant.alias);
  const aliasLookup = new Set(aliases.map((item) => item.toLowerCase()));
  if (!aliasLookup.has(nextPrimary.toLowerCase())) {
    throw new Error('Selected value must be an existing alias.');
  }

  const nextAliasValues = uniqueNames([
    participant.primaryName,
    ...aliases.filter((alias) => alias.toLowerCase() !== nextPrimary.toLowerCase()),
  ]).filter((name) => normaliseName(name) !== normaliseName(nextPrimary));

  return {
    primaryName: nextPrimary,
    alias: nextAliasValues.length > 0 ? nextAliasValues.join(', ') : null,
  };
};

export interface MergeResult {
  primaryName: string | null;
  alias: string | null;
}

export const buildMergeResult = (
  participantToKeep: MergeParticipantRecord,
  participantToRemove: MergeParticipantRecord,
): MergeResult => {
  const keepPrimary = participantToKeep.primaryName?.trim() || null;
  const aliases = uniqueNames([
    ...splitAliasValues(participantToKeep.alias),
    ...splitAliasValues(participantToRemove.alias),
    participantToKeep.primaryName,
    participantToRemove.primaryName,
  ]);
  const filteredAliases = aliases.filter(
    (name) => normaliseName(name) !== normaliseName(keepPrimary),
  );
  return {
    primaryName: keepPrimary,
    alias: filteredAliases.length > 0 ? filteredAliases.join(', ') : null,
  };
};
