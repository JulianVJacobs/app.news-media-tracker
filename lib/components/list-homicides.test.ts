import {
  compareCasesByParticipantType,
  getCaseParticipantTypes,
  matchesParticipantTypeFilter,
} from './list-homicides.utils';
import type { Perpetrator, Victim } from '../db/schema';

describe('list-homicides participant type helpers', () => {
  const victim = {
    id: 'v1',
    articleId: 'a1',
    victimName: 'Jane Doe',
  } as Victim;
  const perpetrator = {
    id: 'p1',
    articleId: 'a1',
    perpetratorName: 'John Doe',
  } as Perpetrator;

  const victimOnlyCase: Parameters<typeof getCaseParticipantTypes>[0] = {
    victims: [victim],
    perpetrators: [],
  };
  const perpetratorOnlyCase: Parameters<typeof getCaseParticipantTypes>[0] = {
    victims: [],
    perpetrators: [perpetrator],
  };
  const mixedCase = {
    victims: [victim],
    perpetrators: [perpetrator],
  } as Parameters<typeof getCaseParticipantTypes>[0];
  const otherCase: Parameters<typeof getCaseParticipantTypes>[0] = {
    victims: [],
    perpetrators: [],
  };

  it('derives participant types for victim/perpetrator/other cases', () => {
    expect(getCaseParticipantTypes(victimOnlyCase)).toEqual(['victim']);
    expect(getCaseParticipantTypes(perpetratorOnlyCase)).toEqual([
      'perpetrator',
    ]);
    expect(getCaseParticipantTypes(mixedCase)).toEqual([
      'victim',
      'perpetrator',
    ]);
    expect(getCaseParticipantTypes(otherCase)).toEqual(['other']);
  });

  it('filters by participant type while preserving backwards compatibility', () => {
    expect(matchesParticipantTypeFilter(victimOnlyCase, 'victim')).toBe(true);
    expect(
      matchesParticipantTypeFilter(perpetratorOnlyCase, 'perpetrator'),
    ).toBe(true);
    expect(matchesParticipantTypeFilter(otherCase, 'other')).toBe(true);
    expect(matchesParticipantTypeFilter(victimOnlyCase, 'all')).toBe(true);
  });

  it('sorts by participant type order in both directions', () => {
    expect(
      compareCasesByParticipantType(
        victimOnlyCase,
        perpetratorOnlyCase,
        'asc',
      ),
    ).toBeLessThan(0);
    expect(
      compareCasesByParticipantType(
        otherCase,
        mixedCase,
        'desc',
      ),
    ).toBeLessThan(0);
  });
});
