import {
  evaluateConstraintState,
  resolveRequiredConstraintFields,
  resolveVisibleFieldGroups,
} from './role-visibility';

describe('role/profile visibility helpers', () => {
  it('keeps default participant field visibility when role context is absent', () => {
    expect(resolveVisibleFieldGroups('victim')).toEqual([
      'coreIdentity',
      'demographics',
      'deathDetails',
      'location',
    ]);
  });

  it('applies viewer role visibility restrictions', () => {
    expect(resolveVisibleFieldGroups('victim', { role: 'viewer' })).toEqual([
      'coreIdentity',
    ]);
    expect(resolveVisibleFieldGroups('perpetrator', { role: 'viewer' })).toEqual([
      'coreIdentity',
    ]);
  });

  it('applies editor role restrictions for conviction fields', () => {
    expect(resolveVisibleFieldGroups('perpetrator', { role: 'editor' })).toEqual([
      'coreIdentity',
      'relationship',
      'suspectStatus',
    ]);
  });

  it('applies profile visibility overrides when profile context is present', () => {
    expect(
      resolveVisibleFieldGroups(
        'victim',
        { role: 'admin', profileId: 'focused-profile' },
        {
          'focused-profile': {
            victim: ['coreIdentity', 'demographics'],
          },
        },
      ),
    ).toEqual(['coreIdentity', 'demographics']);
  });

  it('resolves required fields from profile overrides before defaults', () => {
    expect(
      resolveRequiredConstraintFields(
        'victim',
        { profileId: 'lightweight-profile' },
        {
          profileRequiredFieldRules: {
            'lightweight-profile': { victim: ['victimName'] },
          },
        },
      ),
    ).toEqual(['victimName']);
  });

  it('evaluates missing required fields correctly', () => {
    expect(
      evaluateConstraintState(
        {
          victimName: '  ',
          dateOfDeath: '2026-04-20',
        },
        ['victimName', 'dateOfDeath'],
      ),
    ).toEqual({
      requiredFields: ['victimName', 'dateOfDeath'],
      missingRequiredFields: ['victimName'],
      isValid: false,
    });
  });
});
