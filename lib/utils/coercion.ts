export const toNullableString = (
  value: unknown,
  fallback: string | null = null,
): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return fallback;
};

export const toRequiredString = (value: unknown, fallback = ''): string => {
  const coerced = toNullableString(value, null);
  return coerced && coerced.length > 0 ? coerced : fallback;
};

export const toNullableNumber = (
  value: unknown,
  fallback: number | null = null,
): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

export const toNullableIsoString = (
  value: unknown,
  fallback: string | null = null,
): string | null => {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return trimmed;
  }
  return fallback;
};
