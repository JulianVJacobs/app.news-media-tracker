export const SCHEMA_PROFILE_DEFAULT = 'default';

export const HOMICIDE_EVENT_DATETIME_MODES = [
  'EXACT',
  'RANGE',
  'UNKNOWN',
] as const;

export const HOMICIDE_EVENT_ROLE_VOCABULARY = [
  'Victim',
  'Perpetrator',
  'Witness',
  'Reporter',
  'Investigator',
  'Judge',
  'Prosecutor',
  'Community member',
  'Police officer',
  'Security guard',
  'Unknown person',
] as const;

export const HOMICIDE_EVENT_PROFILE = {
  id: SCHEMA_PROFILE_DEFAULT,
  name: 'Homicide default',
  entityLevel: 'event',
  description: 'Default homicide event schema profile',
} as const;

export const HOMICIDE_EVENT_PROFILE_FIELDS = [
  {
    entityType: 'event',
    fieldKey: 'datetime_mode',
    fieldType: 'enum',
    fieldConfig: {
      allowedValues: HOMICIDE_EVENT_DATETIME_MODES,
      defaultValue: 'UNKNOWN',
    },
  },
  {
    entityType: 'event',
    fieldKey: 'event_type',
    fieldType: 'string',
    fieldConfig: {},
  },
  {
    entityType: 'event',
    fieldKey: 'location',
    fieldType: 'object',
    fieldConfig: {
      pointField: 'location_point',
      fallbackField: 'location_fallback',
    },
  },
  {
    entityType: 'event',
    fieldKey: 'location_type',
    fieldType: 'array',
    fieldConfig: {
      itemType: 'string',
    },
  },
  {
    entityType: 'event',
    fieldKey: 'role',
    fieldType: 'vocabulary',
    fieldConfig: {
      allowedValues: HOMICIDE_EVENT_ROLE_VOCABULARY,
    },
  },
] as const;
