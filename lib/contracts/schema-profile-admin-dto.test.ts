import {
  parseProfileCreateDto,
  parseProfileDeleteDto,
  parseProfileUpdateDto,
} from './schema-profile-admin-dto';

describe('schema profile admin DTO parsers', () => {
  it('parses create payloads with camelCase and snake_case keys', () => {
    const camelCase = parseProfileCreateDto({
      name: 'Custom profile',
      entityLevel: 'event',
      description: 'For testing',
    });
    const snakeCase = parseProfileCreateDto({
      name: 'Custom profile',
      entity_level: 'event',
    });

    expect(camelCase).toEqual({
      success: true,
      data: {
        id: null,
        name: 'Custom profile',
        entityLevel: 'event',
        description: 'For testing',
      },
    });
    expect(snakeCase).toEqual({
      success: true,
      data: {
        id: null,
        name: 'Custom profile',
        entityLevel: 'event',
        description: null,
      },
    });
  });

  it('rejects invalid create payloads', () => {
    const parsed = parseProfileCreateDto({
      name: '   ',
      entityLevel: '',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.errors).toContain('name is required');
      expect(parsed.errors).toContain('entityLevel is required');
    }
  });

  it('requires id and at least one updatable field for updates', () => {
    const missingFields = parseProfileUpdateDto({ id: 'profile-1' });
    const valid = parseProfileUpdateDto({
      id: 'profile-1',
      name: 'Renamed profile',
    });

    expect(missingFields.success).toBe(false);
    if (!missingFields.success) {
      expect(missingFields.errors).toContain(
        'At least one of name, entityLevel, or description must be provided',
      );
    }
    expect(valid).toEqual({
      success: true,
      data: {
        id: 'profile-1',
        name: 'Renamed profile',
        entityLevel: null,
        description: null,
      },
    });
  });

  it('requires id for delete payloads', () => {
    expect(parseProfileDeleteDto({ id: 'profile-1' })).toEqual({
      success: true,
      data: { id: 'profile-1' },
    });
    expect(parseProfileDeleteDto({})).toEqual({
      success: false,
      errors: ['id is required'],
    });
  });
});
