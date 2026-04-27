import {
  buildVisibleFieldSet,
  filterRequiredFieldsByVisibility,
} from './participant-field-visibility';

describe('participant field visibility helpers', () => {
  it('builds a visible field set from group mappings', () => {
    const visible = buildVisibleFieldSet(
      {
        coreIdentity: true,
        conviction: false,
      },
      {
        coreIdentity: ['perpetratorName', 'perpetratorAlias'],
        conviction: ['conviction', 'sentence'],
      },
    );

    expect(Array.from(visible)).toEqual(['perpetratorName', 'perpetratorAlias']);
  });

  it('filters required fields to only visible fields', () => {
    const visible = new Set(['perpetratorName', 'perpetratorAlias']);
    expect(
      filterRequiredFieldsByVisibility(
        ['perpetratorName', 'conviction', 'sentence'],
        visible,
      ),
    ).toEqual(['perpetratorName']);
  });
});
