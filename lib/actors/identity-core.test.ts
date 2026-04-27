import {
  buildActorAliasPromotionResult,
  buildActorDuplicateCandidates,
  scoreActorDuplicateCandidate,
  type ActorIdentityRecord,
} from './identity-core';

describe('actor identity core scoring', () => {
  it('reuses alias merge behavior when promoting actor aliases', () => {
    const promoted = buildActorAliasPromotionResult(
      {
        id: 'actor-1',
        canonicalLabel: 'Jane Doe',
        aliases: ['J. Doe', 'Janie'],
      },
      'Janie',
    );

    expect(promoted).toEqual({
      canonicalLabel: 'Janie',
      aliases: ['J. Doe', 'Jane Doe'],
    });
  });

  it('scores duplicates using canonical, alias, identifier, and kind fields', () => {
    const left: ActorIdentityRecord = {
      id: 'a1',
      canonicalLabel: 'Jane Doe',
      actorKind: 'person',
      aliases: ['Janie'],
      identifiers: [{ namespace: 'legacy_victim_id', value: 'V-001' }],
    };
    const right: ActorIdentityRecord = {
      id: 'a2',
      canonicalLabel: 'J. Doe',
      actorKind: 'person',
      aliases: ['Jane Doe'],
      identifiers: [
        { namespace: 'legacy_victim_id', value: 'V-001' },
        { namespace: 'external', value: '123' },
      ],
    };

    const scored = scoreActorDuplicateCandidate(left, right);

    expect(scored.score).toBeGreaterThanOrEqual(0.4);
    expect(scored.breakdown.find((item) => item.field === 'aliases')?.score).toBeGreaterThan(
      0,
    );
    expect(
      scored.breakdown.find((item) => item.field === 'identifiers')?.matches,
    ).toContain('legacy_victim_id:v-001');
    expect(scored.breakdown.find((item) => item.field === 'actorKind')?.score).toBe(
      0.05,
    );
  });

  it('builds sorted candidate pairs above the minimum score threshold', () => {
    const candidates = buildActorDuplicateCandidates([
      {
        id: 'a1',
        canonicalLabel: 'Jane Doe',
        actorKind: 'person',
        aliases: ['J. Doe'],
        identifiers: [{ namespace: 'legacy_victim_id', value: 'V-001' }],
      },
      {
        id: 'a2',
        canonicalLabel: 'J. Doe',
        actorKind: 'person',
        aliases: ['Jane Doe'],
        identifiers: [{ namespace: 'legacy_victim_id', value: 'V-001' }],
      },
      {
        id: 'a3',
        canonicalLabel: 'Different Name',
        actorKind: 'organization',
        aliases: ['Other'],
        identifiers: [{ namespace: 'legacy_victim_id', value: 'V-999' }],
      },
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).toBe('a1::a2');
    expect(candidates[0].score).toBeGreaterThan(0.4);
  });
});
