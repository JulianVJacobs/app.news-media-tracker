import {
  EVENTS_CONTRACT,
  EVENTS_CONTRACT_VERSION,
  EVENT_ROLE_VOCABULARY,
} from './events-contract';

describe('events contract', () => {
  it('publishes a pinned contract version', () => {
    expect(EVENTS_CONTRACT.version).toBe(EVENTS_CONTRACT_VERSION);
  });

  it('publishes event actor role and claim payload fields', () => {
    expect(EVENTS_CONTRACT.eventActorRolePayload.fields).toEqual([
      'event_id',
      'actor_id',
      'role_term',
      'confidence',
      'certainty',
      'is_primary',
    ]);
    expect(EVENTS_CONTRACT.claimPayload.fields).toEqual([
      'subject_type',
      'subject_id',
      'predicate',
      'value',
      'evidence_references',
    ]);
  });

  it('freezes the role vocabulary for this phase', () => {
    expect(EVENTS_CONTRACT.roleVocabulary).toEqual(EVENT_ROLE_VOCABULARY);
    expect(EVENTS_CONTRACT.roleVocabulary).toEqual(
      expect.arrayContaining(['victim', 'perpetrator', 'witness']),
    );
  });
});
