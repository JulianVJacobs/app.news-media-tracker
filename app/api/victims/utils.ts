import type { Victim } from '../../../lib/db/schema';
import {
  toNullableNumber,
  toNullableString,
  toRequiredString,
} from '../../../lib/utils/coercion';

type VictimCoreFields =
  | 'articleId'
  | 'victimName'
  | 'victimAlias'
  | 'dateOfDeath'
  | 'placeOfDeathProvince'
  | 'placeOfDeathTown'
  | 'typeOfLocation'
  | 'policeStation'
  | 'sexualAssault'
  | 'genderOfVictim'
  | 'raceOfVictim'
  | 'ageOfVictim'
  | 'ageRangeOfVictim'
  | 'modeOfDeathSpecific'
  | 'modeOfDeathGeneral'
  | 'typeOfMurder';

export type VictimCore = Pick<Victim, VictimCoreFields>;

export const coerceVictim = (
  victimData: Record<string, unknown>,
  current?: Victim,
): VictimCore => ({
  articleId: toRequiredString(victimData.articleId, current?.articleId ?? ''),
  victimName: toNullableString(
    victimData.victimName,
    current?.victimName ?? null,
  ),
  victimAlias: toNullableString(
    victimData.victimAlias,
    current?.victimAlias ?? null,
  ),
  dateOfDeath: toNullableString(
    victimData.dateOfDeath,
    current?.dateOfDeath ?? null,
  ),
  placeOfDeathProvince: toNullableString(
    victimData.placeOfDeathProvince,
    current?.placeOfDeathProvince ?? null,
  ),
  placeOfDeathTown: toNullableString(
    victimData.placeOfDeathTown,
    current?.placeOfDeathTown ?? null,
  ),
  typeOfLocation: toNullableString(
    victimData.typeOfLocation,
    current?.typeOfLocation ?? null,
  ),
  policeStation: toNullableString(
    victimData.policeStation,
    current?.policeStation ?? null,
  ),
  sexualAssault: toNullableString(
    victimData.sexualAssault,
    current?.sexualAssault ?? null,
  ),
  genderOfVictim: toNullableString(
    victimData.genderOfVictim,
    current?.genderOfVictim ?? null,
  ),
  raceOfVictim: toNullableString(
    victimData.raceOfVictim,
    current?.raceOfVictim ?? null,
  ),
  ageOfVictim: toNullableNumber(
    victimData.ageOfVictim,
    current?.ageOfVictim ?? null,
  ),
  ageRangeOfVictim: toNullableString(
    victimData.ageRangeOfVictim,
    current?.ageRangeOfVictim ?? null,
  ),
  modeOfDeathSpecific: toNullableString(
    victimData.modeOfDeathSpecific,
    current?.modeOfDeathSpecific ?? null,
  ),
  modeOfDeathGeneral: toNullableString(
    victimData.modeOfDeathGeneral,
    current?.modeOfDeathGeneral ?? null,
  ),
  typeOfMurder: toNullableString(
    victimData.typeOfMurder,
    current?.typeOfMurder ?? null,
  ),
});
