import {
  joinAliases,
  mergeAliasValues,
  splitAliases,
} from './participant/[role]/utils';

describe('participant merge and promotion alias utilities', () => {
  it('preserves unique aliases and trims values', () => {
    expect(splitAliases('  Alpha | Beta|  Gamma  ')).toEqual([
      'Alpha',
      'Beta',
      'Gamma',
    ]);
    expect(joinAliases([' Alpha ', 'alpha', 'Beta'])).toBe('Alpha | Beta');
  });

  it('preserves previous primary name during alias promotion', () => {
    const aliasAfterPromotion = mergeAliasValues(
      'Alias One | Alias Two',
      ['Old Primary'],
      ['Alias One'],
    );

    expect(aliasAfterPromotion).toBe('Alias Two | Old Primary');
  });

  it('merges aliases from source into target without duplicating target primary', () => {
    const mergedAlias = mergeAliasValues(
      'Target Alias',
      ['Source Primary', 'Source Alias | Target Primary'],
      ['Target Primary'],
    );

    expect(mergedAlias).toBe('Target Alias | Source Primary | Source Alias');
  });
});
