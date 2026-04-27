import { coerceVictim } from './victims/utils';
import { coercePerpetrator } from './perpetrators/utils';

describe('participant alias coercion', () => {
  it('normalizes victim alias values', () => {
    const victim = coerceVictim({
      articleId: 'article-1',
      victimAlias: '  The Tiger  ',
    });

    expect(victim.victimAlias).toBe('The Tiger');
  });

  it('keeps existing victim alias when not provided in updates', () => {
    const victim = coerceVictim(
      {
        articleId: 'article-1',
      },
      {
        id: 'victim-1',
        articleId: 'article-1',
        victimName: 'Jane Doe',
        victimAlias: 'Existing Alias',
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
    );

    expect(victim.victimAlias).toBe('Existing Alias');
  });

  it('normalizes perpetrator alias values', () => {
    const perpetrator = coercePerpetrator({
      articleId: 'article-1',
      perpetratorAlias: '  Shadow  ',
    });

    expect(perpetrator.perpetratorAlias).toBe('Shadow');
  });
});
