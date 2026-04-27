import {
  DEFAULT_EVENT_ACTOR_ROLE_TERMS,
  EVENT_ACTOR_ROLE_VOCAB_KEY,
} from './role-vocabulary';
import {
  migrationClaimEvidence,
  migrationClaims,
  migrationEventActorRoles,
  migrations,
} from './schema';
import { buildEscapedSqlInList } from './domain-constants';

describe('event actor role vocabulary and migrations', () => {
  it('includes the default homicide role vocabulary terms', () => {
    expect(EVENT_ACTOR_ROLE_VOCAB_KEY).toBe('event_actor_role');
    expect(DEFAULT_EVENT_ACTOR_ROLE_TERMS.map((term) => term.label)).toEqual([
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
    ]);
  });

  it('registers Phase 3 migrations with role and claim constraints', () => {
    expect(migrations).toContain(migrationEventActorRoles);
    expect(migrations).toContain(migrationClaims);
    expect(migrations).toContain(migrationClaimEvidence);
    expect(migrationClaims).toContain(
      "CHECK (subject_type IN ('actor', 'event_actor_role'))",
    );
    expect(migrationEventActorRoles).toContain(
      "CHECK (certainty IN ('known', 'suspected', 'unknown'))",
    );
  });

  it('escapes SQL list values safely', () => {
    expect(buildEscapedSqlInList(["o'clock", 'safe'])).toBe("'o''clock', 'safe'");
  });
});
