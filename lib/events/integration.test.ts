import { buildIntegratedEventPayload } from './integration';

describe('event integration payload', () => {
  it('maps legacy victim/perpetrator records into actors and default roles', () => {
    const payload = buildIntegratedEventPayload(
      {
        id: 'event-1',
        eventTypes: ['homicide'],
        articleIds: ['article-1'],
        participantIds: ['victim-1', 'perp-1'],
        details: {},
        createdAt: '2026-04-19T00:00:00.000Z',
        updatedAt: '2026-04-19T00:00:00.000Z',
        syncStatus: 'synced',
        failureCount: 0,
      },
      [
        {
          id: 'victim-1',
          articleId: 'article-1',
          victimName: 'Jane Doe',
          victimAlias: 'J.D.| Janey',
          mergedIntoId: null,
          mergedAt: null,
          mergeAudit: null,
          promotionAudit: null,
          dateOfDeath: null,
          placeOfDeathProvince: null,
          placeOfDeathTown: null,
          typeOfLocation: null,
          policeStation: null,
          sexualAssault: null,
          genderOfVictim: null,
          raceOfVictim: null,
          ageOfVictim: null,
          ageRangeOfVictim: null,
          modeOfDeathSpecific: null,
          modeOfDeathGeneral: null,
          typeOfMurder: null,
          createdAt: null,
          updatedAt: null,
          syncStatus: null,
          failureCount: null,
          lastSyncAt: null,
        },
      ],
      [
        {
          id: 'perp-1',
          articleId: 'article-1',
          perpetratorName: 'John Roe',
          perpetratorAlias: 'Roe, J.R.',
          mergedIntoId: null,
          mergedAt: null,
          mergeAudit: null,
          promotionAudit: null,
          perpetratorRelationshipToVictim: null,
          suspectIdentified: null,
          suspectArrested: null,
          suspectCharged: null,
          conviction: null,
          sentence: null,
          createdAt: null,
          updatedAt: null,
          syncStatus: null,
          failureCount: null,
          lastSyncAt: null,
        },
      ],
    );

    expect(payload.actors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actor_id: 'victim-1',
          canonical_label: 'Jane Doe',
          aliases: ['J.D.', 'Janey'],
        }),
        expect.objectContaining({
          actor_id: 'perp-1',
          canonical_label: 'John Roe',
        }),
      ]),
    );
    const perpetratorActor = payload.actors.find(
      (actor) => actor.actor_id === 'perp-1',
    );
    expect(perpetratorActor?.aliases).toEqual(['Roe', 'J.R.']);

    expect(payload.event_actor_roles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ actor_id: 'victim-1', role_term: 'victim' }),
        expect.objectContaining({
          actor_id: 'perp-1',
          role_term: 'perpetrator',
        }),
      ]),
    );

    const actorIds = new Set(payload.actors.map((actor) => actor.actor_id));
    expect(
      payload.event_actor_roles.every((role) => actorIds.has(role.actor_id)),
    ).toBe(true);
    expect(payload.claims).toEqual([]);
  });

  it('honors explicit role + claim payload from event details when provided', () => {
    const payload = buildIntegratedEventPayload(
      {
        id: 'event-2',
        eventTypes: ['homicide'],
        articleIds: ['article-2'],
        participantIds: ['victim-2'],
        details: {
          event_actor_roles: [
            {
              event_id: 'event-2',
              actor_id: 'victim-2',
              role_term: 'witness',
              confidence: 0.4,
              certainty: 'possible',
              is_primary: false,
            },
            {
              actor_id: 'missing-actor',
              role_term: 'other',
            },
          ],
          claims: [
            {
              subject_type: 'actor',
              subject_id: 'victim-2',
              predicate: 'mentions',
              value: 'saw incident',
              evidence_references: ['article-2'],
            },
          ],
        },
        createdAt: '2026-04-19T00:00:00.000Z',
        updatedAt: '2026-04-19T00:00:00.000Z',
        syncStatus: 'synced',
        failureCount: 0,
      },
      [
        {
          id: 'victim-2',
          articleId: 'article-2',
          victimName: 'Witness One',
          victimAlias: null,
          mergedIntoId: null,
          mergedAt: null,
          mergeAudit: null,
          promotionAudit: null,
          dateOfDeath: null,
          placeOfDeathProvince: null,
          placeOfDeathTown: null,
          typeOfLocation: null,
          policeStation: null,
          sexualAssault: null,
          genderOfVictim: null,
          raceOfVictim: null,
          ageOfVictim: null,
          ageRangeOfVictim: null,
          modeOfDeathSpecific: null,
          modeOfDeathGeneral: null,
          typeOfMurder: null,
          createdAt: null,
          updatedAt: null,
          syncStatus: null,
          failureCount: null,
          lastSyncAt: null,
        },
      ],
      [],
    );

    expect(payload.event_actor_roles).toEqual([
      {
        event_id: 'event-2',
        actor_id: 'victim-2',
        role_term: 'witness',
        confidence: 0.4,
        certainty: 'possible',
        is_primary: false,
      },
    ]);
    expect(payload.claims).toEqual([
      {
        subject_type: 'actor',
        subject_id: 'victim-2',
        predicate: 'mentions',
        value: 'saw incident',
        evidence_references: ['article-2'],
      },
    ]);
  });
});
