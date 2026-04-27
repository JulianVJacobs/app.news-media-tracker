export const PARTICIPANT_MERGE_CONTRACT_VERSION = '2026-04-18';

export const PARTICIPANT_MERGE_ENDPOINTS = {
  merge: '/api/participants/merge',
  aliasPromotion: '/api/participants/alias-promotion',
} as const;

export type ParticipantRole = 'participant' | 'victim' | 'perpetrator';

export interface ParticipantMergeRequest {
  sourceParticipantId: string;
  targetParticipantId: string;
  sourceRole: ParticipantRole;
  targetRole: ParticipantRole;
  reason?: string;
}

export interface ParticipantMergeResult {
  mergedParticipantId: string;
  removedParticipantId: string;
  aliasesAdded: string[];
}

export interface AliasPromotionRequest {
  participantId: string;
  role: ParticipantRole;
  aliasToPromote: string;
}

export interface AliasPromotionResult {
  participantId: string;
  role: ParticipantRole;
  newPrimaryName: string;
  demotedPrimaryAlias: string | null;
}

export const PARTICIPANT_MERGE_CONTRACT = {
  version: PARTICIPANT_MERGE_CONTRACT_VERSION,
  endpoints: PARTICIPANT_MERGE_ENDPOINTS,
  operations: {
    merge: {
      requestFields: [
        'sourceParticipantId',
        'targetParticipantId',
        'sourceRole',
        'targetRole',
        'reason',
      ],
      resultFields: ['mergedParticipantId', 'removedParticipantId', 'aliasesAdded'],
    },
    aliasPromotion: {
      requestFields: ['participantId', 'role', 'aliasToPromote'],
      resultFields: [
        'participantId',
        'role',
        'newPrimaryName',
        'demotedPrimaryAlias',
      ],
    },
  },
} as const;

