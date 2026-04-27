import {
  HOMICIDE_DEFAULT_DOMAIN_SEED,
  applyDomainSeed,
  type DomainSeedSqlClient,
} from './domain-seed';

type Statement = string | { sql: string; args?: unknown[] };

class MockSqlClient implements DomainSeedSqlClient {
  private readonly tables: Set<string>;

  private readonly profiles = new Set<string>();

  private readonly fields = new Set<string>();

  private readonly constraints = new Set<string>();

  constructor(tables: string[]) {
    this.tables = new Set(tables);
  }

  async execute(
    statement: Statement,
  ): Promise<{ rows?: unknown[]; rowsAffected?: number }> {
    const sql = typeof statement === 'string' ? statement : statement.sql;
    const args = typeof statement === 'string' ? [] : statement.args ?? [];

    if (sql.includes('sqlite_master')) {
      const table = String(args[0] ?? '');
      return { rows: this.tables.has(table) ? [{ name: table }] : [] };
    }

    if (sql.includes('INSERT OR IGNORE INTO schema_profile')) {
      const key = String(args[0] ?? '');
      const inserted = this.insertOnce(this.profiles, key);
      return { rowsAffected: inserted ? 1 : 0 };
    }

    if (sql.includes('INSERT OR IGNORE INTO schema_field')) {
      const key = `${args[0]}:${args[1]}:${args[2]}`;
      const inserted = this.insertOnce(this.fields, key);
      return { rowsAffected: inserted ? 1 : 0 };
    }

    if (sql.includes('INSERT OR IGNORE INTO schema_constraint')) {
      const key = `${args[0]}:${args[1]}`;
      const inserted = this.insertOnce(this.constraints, key);
      return { rowsAffected: inserted ? 1 : 0 };
    }

    return { rowsAffected: 0 };
  }

  private insertOnce(target: Set<string>, key: string): boolean {
    if (target.has(key)) {
      return false;
    }
    target.add(key);
    return true;
  }
}

describe('applyDomainSeed', () => {
  it('applies homicide default seed once and remains idempotent on rerun', async () => {
    const client = new MockSqlClient([
      'schema_profile',
      'schema_field',
      'schema_constraint',
    ]);

    const firstRun = await applyDomainSeed(client, HOMICIDE_DEFAULT_DOMAIN_SEED);
    const secondRun = await applyDomainSeed(client, HOMICIDE_DEFAULT_DOMAIN_SEED);

    expect(firstRun.profileRowsAffected).toBe(1);
    expect(firstRun.fieldRowsAffected).toBe(
      HOMICIDE_DEFAULT_DOMAIN_SEED.fields.length,
    );
    expect(firstRun.constraintRowsAffected).toBe(
      Object.keys(HOMICIDE_DEFAULT_DOMAIN_SEED.constraints).length,
    );
    expect(firstRun.skippedTables).toEqual([]);

    expect(secondRun.profileRowsAffected).toBe(0);
    expect(secondRun.fieldRowsAffected).toBe(0);
    expect(secondRun.constraintRowsAffected).toBe(0);
    expect(secondRun.skippedTables).toEqual([]);
  });

  it('skips missing tables to stay migration-safe', async () => {
    const client = new MockSqlClient(['schema_profile']);

    const result = await applyDomainSeed(client, HOMICIDE_DEFAULT_DOMAIN_SEED);

    expect(result.profileRowsAffected).toBe(1);
    expect(result.fieldRowsAffected).toBe(0);
    expect(result.constraintRowsAffected).toBe(0);
    expect(result.skippedTables).toEqual(
      expect.arrayContaining(['schema_field', 'schema_constraint']),
    );
  });

  it('records all missing table dependencies when profile table is absent', async () => {
    const client = new MockSqlClient([]);

    const result = await applyDomainSeed(client, HOMICIDE_DEFAULT_DOMAIN_SEED);

    expect(result.profileRowsAffected).toBe(0);
    expect(result.fieldRowsAffected).toBe(0);
    expect(result.constraintRowsAffected).toBe(0);
    expect(result.skippedTables).toEqual(
      expect.arrayContaining([
        'schema_profile',
        'schema_field',
        'schema_constraint',
      ]),
    );
  });
});
