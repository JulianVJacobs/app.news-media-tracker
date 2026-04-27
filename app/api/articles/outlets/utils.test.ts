import {
  buildOutletSuggestions,
  normalizeOutletValue,
  normalizeTermKey,
} from './utils';

describe('article outlet suggestion utilities', () => {
  it('normalizes outlet values', () => {
    expect(normalizeOutletValue('  Daily   Maverick  ')).toBe('Daily Maverick');
  });

  it('normalizes term keys for persistence', () => {
    expect(normalizeTermKey(' News24 / Cape Town ')).toBe('news24-cape-town');
  });

  it('deduplicates, matches, and prioritizes prefix matches', () => {
    expect(
      buildOutletSuggestions(
        'ti',
        ['TimesLIVE', 'IOL', 'Daily Maverick', 'timeslive', 'City Press'],
        10,
      ),
    ).toEqual(['TimesLIVE']);
  });
});
