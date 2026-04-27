import {
  migrationActors,
  migrationActorAliases,
  migrationActorIdentifiers,
  migrationBackfillPerpIdentifiers,
  migrationBackfillVictimIdentifiers,
  migrations,
} from './schema';

describe('actor generalization schema migrations', () => {
  it('creates actor tables', () => {
    expect(migrationActors).toContain('CREATE TABLE IF NOT EXISTS actor');
    expect(migrationActorAliases).toContain(
      'CREATE TABLE IF NOT EXISTS actor_alias',
    );
    expect(migrationActorIdentifiers).toContain(
      'CREATE TABLE IF NOT EXISTS actor_identifier',
    );
  });

  it('includes legacy namespace mappings for victim and perpetrator ids', () => {
    expect(migrationBackfillVictimIdentifiers).toContain("'legacy_victim_id'");
    expect(migrationBackfillPerpIdentifiers).toContain("'legacy_perp_id'");
  });

  it('registers actor migrations in unified migration list', () => {
    expect(migrations).toContain(migrationActors);
    expect(migrations).toContain(migrationActorAliases);
    expect(migrations).toContain(migrationActorIdentifiers);
  });
});
