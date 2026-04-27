import { loadSchemaProfile } from './schema-profile-loader';

const createMockDb = (responses: unknown[][]) => {
  const queue = [...responses];
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            const next = queue.shift();
            if (!next) {
              throw new Error('Unexpected extra schema profile query');
            }
            return next;
          },
        }),
      }),
    }),
  };
};

describe('loadSchemaProfile', () => {
  it('returns requested profile when it exists', async () => {
    const db = createMockDb([
      [
        {
          id: 'custom-profile',
          name: 'Custom',
          entityLevel: 'event',
          description: 'Custom event profile',
        },
      ],
      [],
      [
        {
          fieldKey: 'datetime_mode',
          fieldType: 'enum',
          fieldConfig: { allowedValues: ['EXACT', 'RANGE', 'UNKNOWN'] },
        },
      ],
    ]);

    const loaded = await loadSchemaProfile(db, 'custom-profile', 'event');

    expect(loaded).toEqual({
      id: 'custom-profile',
      name: 'Custom',
      entityLevel: 'event',
      description: 'Custom event profile',
      fields: [
        {
          fieldKey: 'datetime_mode',
          fieldType: 'enum',
          fieldConfig: { allowedValues: ['EXACT', 'RANGE', 'UNKNOWN'] },
        },
      ],
    });
  });

  it('falls back to default profile when requested profile is missing', async () => {
    const db = createMockDb([
      [],
      [
        {
          id: 'default',
          name: 'Homicide default',
          entityLevel: 'event',
          description: 'Default homicide event schema profile',
        },
      ],
      [],
    ]);

    const loaded = await loadSchemaProfile(db, 'unknown', 'event');

    expect(loaded).toEqual({
      id: 'default',
      name: 'Homicide default',
      entityLevel: 'event',
      description: 'Default homicide event schema profile',
      fields: [],
    });
  });
});
