export const EVENTS_CONTRACT_VERSION = '2026-04-19';

export const EVENT_ROLE_VOCABULARY = [
  'victim',
  'perpetrator',
  'witness',
  'reporter',
  'investigator',
  'other',
] as const;

export const EVENTS_CONTRACT = {
  version: EVENTS_CONTRACT_VERSION,
  endpoints: {
    contract: '/api/events/contract',
    eventById: '/api/events/:id',
  },
  eventSchema: {
    annotationEventFields: [
      'id',
      'eventTypes',
      'articleIds',
      'participantIds',
      'details',
      'createdAt',
      'updatedAt',
      'syncStatus',
      'failureCount',
    ],
    datetimeModes: ['unknown', 'date', 'datetime', 'range'] as const,
    locationShape: ['country', 'province', 'town', 'site', 'type'] as const,
  },
  actorSchema: {
    fields: ['actor_id', 'canonical_label', 'aliases', 'identifiers', 'legacy'],
    legacyMapping: {
      victim: {
        sourceTable: 'victims',
        primaryLabelField: 'victim_name',
        aliasField: 'victim_alias',
      },
      perpetrator: {
        sourceTable: 'perpetrators',
        primaryLabelField: 'perpetrator_name',
        aliasField: 'perpetrator_alias',
      },
    },
  },
  eventActorRolePayload: {
    fields: [
      'event_id',
      'actor_id',
      'role_term',
      'confidence',
      'certainty',
      'is_primary',
    ],
  },
  claimPayload: {
    fields: [
      'subject_type',
      'subject_id',
      'predicate',
      'value',
      'evidence_references',
    ],
  },
  roleVocabulary: EVENT_ROLE_VOCABULARY,
} as const;
