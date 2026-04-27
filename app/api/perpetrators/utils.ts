import type { Perpetrator } from '../../../lib/db/schema';
import {
  toNullableString,
  toRequiredString,
} from '../../../lib/utils/coercion';

type PerpetratorCoreFields =
  | 'articleId'
  | 'perpetratorName'
  | 'perpetratorAlias'
  | 'perpetratorRelationshipToVictim'
  | 'suspectIdentified'
  | 'suspectArrested'
  | 'suspectCharged'
  | 'conviction'
  | 'sentence';

export type PerpetratorCore = Pick<Perpetrator, PerpetratorCoreFields>;

export const coercePerpetrator = (
  data: Record<string, unknown>,
  current?: Perpetrator,
): PerpetratorCore => ({
  articleId: toRequiredString(data.articleId, current?.articleId ?? ''),
  perpetratorName: toNullableString(
    data.perpetratorName,
    current?.perpetratorName ?? null,
  ),
  perpetratorAlias: toNullableString(
    data.perpetratorAlias,
    current?.perpetratorAlias ?? null,
  ),
  perpetratorRelationshipToVictim: toNullableString(
    data.perpetratorRelationshipToVictim,
    current?.perpetratorRelationshipToVictim ?? null,
  ),
  suspectIdentified: toNullableString(
    data.suspectIdentified,
    current?.suspectIdentified ?? null,
  ),
  suspectArrested: toNullableString(
    data.suspectArrested,
    current?.suspectArrested ?? null,
  ),
  suspectCharged: toNullableString(
    data.suspectCharged,
    current?.suspectCharged ?? null,
  ),
  conviction: toNullableString(data.conviction, current?.conviction ?? null),
  sentence: toNullableString(data.sentence, current?.sentence ?? null),
});
