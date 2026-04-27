export const CONFIDENCE_MIN = 0;
export const CONFIDENCE_MAX = 100;

export const EVENT_ACTOR_ROLE_CERTAINTY_VALUES = [
  'known',
  'suspected',
  'unknown',
] as const;

export const CLAIM_SUBJECT_TYPES = ['actor', 'event_actor_role'] as const;
export const CLAIM_VALUE_TYPES = ['string', 'boolean', 'date', 'integer'] as const;
export const CLAIM_EVIDENCE_STRENGTH_VALUES = [
  'strong',
  'moderate',
  'weak',
] as const;

export const buildEscapedSqlInList = (values: readonly string[]): string =>
  values
    .map((value) => `'${value.replaceAll("'", "''")}'`)
    .join(', ');

export const buildConfidenceCheck = (columnName: string): string =>
  `CHECK (${columnName} IS NULL OR (${columnName} >= ${CONFIDENCE_MIN} AND ${columnName} <= ${CONFIDENCE_MAX}))`;
