import {
  PARTICIPANT_MERGE_CONTRACT,
  PARTICIPANT_MERGE_CONTRACT_VERSION,
  PARTICIPANT_MERGE_ENDPOINTS,
} from './participant-merge';

describe('participant merge contract', () => {
  it('publishes a pinned contract version', () => {
    expect(PARTICIPANT_MERGE_CONTRACT.version).toBe(
      PARTICIPANT_MERGE_CONTRACT_VERSION,
    );
  });

  it('exposes merge and alias-promotion endpoints', () => {
    expect(PARTICIPANT_MERGE_CONTRACT.endpoints).toEqual(
      PARTICIPANT_MERGE_ENDPOINTS,
    );
    expect(PARTICIPANT_MERGE_CONTRACT.endpoints.merge).toBe(
      '/api/participants/merge',
    );
    expect(PARTICIPANT_MERGE_CONTRACT.endpoints.aliasPromotion).toBe(
      '/api/participants/alias-promotion',
    );
  });

  it('lists required request and result fields for both operations', () => {
    expect(PARTICIPANT_MERGE_CONTRACT.operations.merge.requestFields).toEqual([
      'sourceParticipantId',
      'targetParticipantId',
      'sourceRole',
      'targetRole',
      'reason',
    ]);
    expect(PARTICIPANT_MERGE_CONTRACT.operations.merge.resultFields).toEqual([
      'mergedParticipantId',
      'removedParticipantId',
      'aliasesAdded',
    ]);
    expect(PARTICIPANT_MERGE_CONTRACT.operations.aliasPromotion.requestFields).toEqual(
      ['participantId', 'role', 'aliasToPromote'],
    );
    expect(PARTICIPANT_MERGE_CONTRACT.operations.aliasPromotion.resultFields).toEqual(
      ['participantId', 'role', 'newPrimaryName', 'demotedPrimaryAlias'],
    );
  });
});
