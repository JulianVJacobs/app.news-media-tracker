const ALIAS_SEPARATOR = '|';
const ALIAS_SPLIT_PATTERN = /\s*\|\s*/;
const ALIAS_JOIN_SEPARATOR = ` ${ALIAS_SEPARATOR} `;

const normaliseAliasToken = (value: string): string => value.trim();

export const splitAliases = (value: string | null | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(ALIAS_SPLIT_PATTERN)
    .map(normaliseAliasToken)
    .filter((token) => token.length > 0);
};

export const joinAliases = (aliases: string[]): string | null => {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const alias of aliases) {
    const normalised = normaliseAliasToken(alias);
    if (!normalised) {
      continue;
    }
    const key = normalised.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    ordered.push(normalised);
  }

  return ordered.length > 0 ? ordered.join(ALIAS_JOIN_SEPARATOR) : null;
};

export const mergeAliasValues = (
  currentAlias: string | null | undefined,
  additions: Array<string | null | undefined>,
  excludedValues: Array<string | null | undefined> = [],
): string | null => {
  const excluded = new Set(
    excludedValues
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0),
  );

  const combined = [
    ...splitAliases(currentAlias),
    ...additions.flatMap((value) => splitAliases(value ?? null)),
  ].filter((alias) => !excluded.has(alias.toLowerCase()));

  return joinAliases(combined);
};
