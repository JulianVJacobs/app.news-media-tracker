import {
  PARTICIPANT_FORM_CONTRACT,
  PARTICIPANT_FORM_CONTRACT_VERSION,
} from './participant-form';

describe('participant form contract', () => {
  it('publishes a pinned contract version', () => {
    expect(PARTICIPANT_FORM_CONTRACT.version).toBe(
      PARTICIPANT_FORM_CONTRACT_VERSION,
    );
  });

  it('includes victim/perpetrator/other type options', () => {
    expect(PARTICIPANT_FORM_CONTRACT.typeOptions).toEqual([
      'victim',
      'perpetrator',
      'other',
    ]);
  });

  it('defines visible field groups for each participant type', () => {
    expect(PARTICIPANT_FORM_CONTRACT.visibleFieldGroups.victim).toEqual(
      expect.arrayContaining(['demographics', 'deathDetails', 'location']),
    );
    expect(PARTICIPANT_FORM_CONTRACT.visibleFieldGroups.perpetrator).toEqual(
      expect.arrayContaining(['relationship', 'suspectStatus', 'conviction']),
    );
    expect(PARTICIPANT_FORM_CONTRACT.visibleFieldGroups.other).toEqual([
      'coreIdentity',
    ]);
  });

  it('publishes role-based visibility rules', () => {
    expect(
      PARTICIPANT_FORM_CONTRACT.roleVisibilityRules.viewer?.victim,
    ).toEqual(['coreIdentity']);
    expect(
      PARTICIPANT_FORM_CONTRACT.roleVisibilityRules.viewer?.perpetrator,
    ).toEqual(['coreIdentity']);
    expect(
      PARTICIPANT_FORM_CONTRACT.roleVisibilityRules.editor?.perpetrator,
    ).toEqual(['coreIdentity', 'relationship', 'suspectStatus']);
  });
});
