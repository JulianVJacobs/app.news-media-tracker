import {
  migrationAnnotationEvents,
  migrationSchemaConstraints,
  migrationSchemaFields,
  migrationSchemaProfiles,
} from './schema';

describe('schema migrations', () => {
  it('defines event profile registry tables', () => {
    expect(migrationSchemaProfiles).toContain('CREATE TABLE IF NOT EXISTS schema_profile');
    expect(migrationSchemaFields).toContain('CREATE TABLE IF NOT EXISTS schema_field');
    expect(migrationSchemaConstraints).toContain('FOREIGN KEY(profile_id) REFERENCES schema_profile(id)');
  });

  it('enforces annotation_event datetime modes at schema level', () => {
    expect(migrationAnnotationEvents).toContain("CHECK(datetime_mode IN ('EXACT', 'RANGE', 'UNKNOWN'))");
    expect(migrationAnnotationEvents).toContain(
      "(datetime_mode = 'EXACT' AND event_date IS NOT NULL AND start_date IS NULL AND end_date IS NULL)",
    );
    expect(migrationAnnotationEvents).toContain(
      "(datetime_mode = 'RANGE' AND event_date IS NULL AND start_date IS NOT NULL AND end_date IS NOT NULL",
    );
    expect(migrationAnnotationEvents).toContain(
      "(datetime_mode = 'UNKNOWN' AND event_date IS NULL AND start_date IS NULL AND end_date IS NULL)",
    );
  });
});
