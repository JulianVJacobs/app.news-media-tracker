export const OUTLET_VOCAB_KEY = 'news_report_outlet';

const whitespacePattern = /\s+/g;
const slugPattern = /[^a-z0-9]+/g;

export const normalizeOutletValue = (value: string): string =>
  value.trim().replace(whitespacePattern, ' ');

export const normalizeTermKey = (value: string): string => {
  const slugBase = normalizeOutletValue(value)
    .toLowerCase()
    .replace(slugPattern, '-');
  let start = 0;
  let end = slugBase.length;

  while (start < end && slugBase[start] === '-') {
    start += 1;
  }
  while (end > start && slugBase[end - 1] === '-') {
    end -= 1;
  }

  const slug = slugBase.slice(start, end);

  return slug || 'outlet';
};

export const buildOutletSuggestions = (
  query: string,
  values: string[],
  limit: number,
): string[] => {
  const normalizedQuery = normalizeOutletValue(query).toLowerCase();
  const seen = new Set<string>();
  const uniqueValues = values
    .map(normalizeOutletValue)
    .filter((value) => value.length > 0)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const filtered = normalizedQuery
    ? uniqueValues.filter((value) => value.toLowerCase().includes(normalizedQuery))
    : uniqueValues;

  const sorted = filtered.sort((left, right) => {
    const leftLower = left.toLowerCase();
    const rightLower = right.toLowerCase();
    const leftStarts = normalizedQuery ? leftLower.startsWith(normalizedQuery) : false;
    const rightStarts = normalizedQuery
      ? rightLower.startsWith(normalizedQuery)
      : false;
    if (leftStarts !== rightStarts) {
      return leftStarts ? -1 : 1;
    }
    return leftLower.localeCompare(rightLower);
  });

  return sorted.slice(0, Math.max(1, limit));
};
