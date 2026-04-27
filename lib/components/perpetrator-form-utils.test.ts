import {
  buildSentenceFromCharge,
  createDefaultChargeEntry,
  mapConvictionFromCharge,
  pluralizeTermUnit,
  serializeAliases,
} from './perpetrator-form-utils';

describe('perpetrator form utilities', () => {
  it('serializes aliases into a JSON array string', () => {
    expect(serializeAliases([' Alpha ', '', 'Bravo'])).toBe('["Alpha","Bravo"]');
  });

  it('maps conviction fallback from first charge', () => {
    expect(mapConvictionFromCharge()).toBe('');
    expect(mapConvictionFromCharge({ ...createDefaultChargeEntry(), convicted: 'Unknown' })).toBe(
      'Unknown',
    );
    expect(mapConvictionFromCharge({ ...createDefaultChargeEntry(), convicted: 'Yes' })).toBe(
      'Guilty',
    );
    expect(mapConvictionFromCharge({ ...createDefaultChargeEntry(), convicted: 'No' })).toBe(
      'Not Guilty',
    );
  });

  it('builds sentence fallback text for supported sentencing types', () => {
    expect(pluralizeTermUnit('Year', 2)).toBe('Years');
    expect(
      buildSentenceFromCharge({
        ...createDefaultChargeEntry(),
        convicted: 'Yes',
        sentenceType: 'Imprisonment',
        imprisonmentQuantity: 3,
        imprisonmentUnit: 'Year',
      }),
    ).toBe('Imprisonment: 3 Years');

    expect(
      buildSentenceFromCharge({
        ...createDefaultChargeEntry(),
        convicted: 'Yes',
        sentenceType: 'Fine',
        fineAmount: 1500,
        fineCurrency: 'ZAR',
      }),
    ).toBe('Fine: 1500 ZAR');
  });
});
