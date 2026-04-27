import { SCHEMA_PROFILE_DEFAULT } from './schema-profile';

export const SCHEMA_CONSTRAINT_PROFILE_DEFAULT = SCHEMA_PROFILE_DEFAULT;

export const SCHEMA_CONSTRAINT_REQUIRED_FIELDS = {
  victim: [
    'victimName',
    'dateOfDeath',
    'placeOfDeathProvince',
    'genderOfVictim',
  ],
  perpetrator: ['perpetratorName'],
  event: ['datetimeMode'],
} as const;

export type ConstraintType = keyof typeof SCHEMA_CONSTRAINT_REQUIRED_FIELDS;

export const getDefaultRequiredFields = (type: ConstraintType): string[] => [
  ...SCHEMA_CONSTRAINT_REQUIRED_FIELDS[type],
];
