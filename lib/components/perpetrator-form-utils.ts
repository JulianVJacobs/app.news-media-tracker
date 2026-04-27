export type ChargeEntry = {
  charge: string;
  chargeOther: string;
  convicted: 'Unknown' | 'Yes' | 'No';
  sentenceType:
    | 'Unknown'
    | 'Imprisonment'
    | 'Correctional supervision'
    | 'Suspended sentence'
    | 'Fine'
    | 'Capital punishment'
    | 'Other';
  imprisonmentQuantity: number;
  imprisonmentUnit: 'Life term' | 'Year' | 'Month';
  correctionalQuantity: number;
  correctionalUnit: 'Year' | 'Month';
  correctionalDetails: string;
  fineAmount: number | null;
  fineCurrency: string;
  sentenceOther: string;
};

export const createDefaultChargeEntry = (): ChargeEntry => ({
  charge: 'Unknown',
  chargeOther: '',
  convicted: 'Unknown',
  sentenceType: 'Unknown',
  imprisonmentQuantity: 1,
  imprisonmentUnit: 'Life term',
  correctionalQuantity: 1,
  correctionalUnit: 'Year',
  correctionalDetails: '',
  fineAmount: null,
  fineCurrency: 'ZAR',
  sentenceOther: '',
});

export const serializeAliases = (aliases: string[]): string =>
  JSON.stringify(aliases.map((alias) => alias.trim()).filter(Boolean));

export const mapConvictionFromCharge = (charge?: ChargeEntry): string => {
  if (!charge) {
    return '';
  }

  if (charge.convicted === 'Yes') {
    return 'Guilty';
  }

  if (charge.convicted === 'No') {
    return 'Not Guilty';
  }

  return 'Unknown';
};

export const pluralizeTermUnit = (
  unit: 'Life term' | 'Year' | 'Month',
  quantity: number,
) => {
  if (quantity <= 1) {
    return unit;
  }

  if (unit === 'Life term') {
    return 'Life terms';
  }

  if (unit === 'Year') {
    return 'Years';
  }

  return 'Months';
};

export const buildSentenceFromCharge = (charge?: ChargeEntry): string => {
  if (!charge || charge.convicted !== 'Yes') {
    return '';
  }

  if (charge.sentenceType === 'Unknown') {
    return 'Unknown';
  }

  if (charge.sentenceType === 'Imprisonment') {
    return `Imprisonment: ${charge.imprisonmentQuantity} ${pluralizeTermUnit(
      charge.imprisonmentUnit,
      charge.imprisonmentQuantity,
    )}`;
  }

  if (charge.sentenceType === 'Correctional supervision') {
    const details = charge.correctionalDetails.trim();
    const base = `Correctional supervision: ${charge.correctionalQuantity} ${pluralizeTermUnit(
      charge.correctionalUnit,
      charge.correctionalQuantity,
    )}`;
    return details ? `${base} (${details})` : base;
  }

  if (charge.sentenceType === 'Fine') {
    if (charge.fineAmount !== null && charge.fineAmount >= 0) {
      return `Fine: ${charge.fineAmount} ${charge.fineCurrency}`;
    }
    return `Fine: ${charge.fineCurrency}`;
  }

  if (charge.sentenceType === 'Other') {
    return charge.sentenceOther.trim() || 'Other';
  }

  return charge.sentenceType;
};
