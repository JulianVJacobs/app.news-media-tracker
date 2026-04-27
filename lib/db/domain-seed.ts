import {
  SCHEMA_CONSTRAINT_REQUIRED_FIELDS,
  type ConstraintType,
} from '../contracts/schema-constraints';
import {
  HOMICIDE_EVENT_PROFILE,
  HOMICIDE_EVENT_PROFILE_FIELDS,
} from '../contracts/schema-profile';

export type DomainSeedDefinition = {
  domainKey: string;
  profile: {
    id: string;
    name: string;
    entityLevel: string;
    description: string;
  };
  fields: Array<{
    entityType: string;
    fieldKey: string;
    fieldType: string;
    fieldConfig: unknown;
  }>;
  constraints: Partial<Record<ConstraintType, string[]>>;
};

type SqlStatement = string | { sql: string; args?: unknown[] };

export type DomainSeedSqlClient = {
  execute: (
    statement: SqlStatement,
  ) => Promise<{ rows?: unknown[]; rowsAffected?: number } | unknown>;
};

export type DomainSeedResult = {
  domainKey: string;
  profileRowsAffected: number;
  fieldRowsAffected: number;
  constraintRowsAffected: number;
  skippedTables: string[];
};

export const HOMICIDE_DEFAULT_DOMAIN_SEED: DomainSeedDefinition = {
  domainKey: 'homicide',
  profile: HOMICIDE_EVENT_PROFILE,
  fields: HOMICIDE_EVENT_PROFILE_FIELDS.map((field) => ({
    entityType: field.entityType,
    fieldKey: field.fieldKey,
    fieldType: field.fieldType,
    fieldConfig: field.fieldConfig,
  })),
  constraints: Object.fromEntries(
    Object.entries(SCHEMA_CONSTRAINT_REQUIRED_FIELDS).map(([type, fields]) => [
      type,
      [...fields],
    ]),
  ) as Partial<Record<ConstraintType, string[]>>,
};

const getRowsAffected = (result: unknown): number => {
  if (
    result &&
    typeof result === 'object' &&
    'rowsAffected' in result &&
    typeof (result as { rowsAffected: unknown }).rowsAffected === 'number'
  ) {
    return (result as { rowsAffected: number }).rowsAffected;
  }
  return 0;
};

const tableExists = async (
  client: DomainSeedSqlClient,
  tableName: string,
): Promise<boolean> => {
  const result = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    args: [tableName],
  });
  if (
    !result ||
    typeof result !== 'object' ||
    !('rows' in result) ||
    !Array.isArray((result as { rows?: unknown[] }).rows)
  ) {
    return false;
  }
  return ((result as { rows: unknown[] }).rows ?? []).length > 0;
};

export const applyDomainSeed = async (
  client: DomainSeedSqlClient,
  seed: DomainSeedDefinition,
): Promise<DomainSeedResult> => {
  const result: DomainSeedResult = {
    domainKey: seed.domainKey,
    profileRowsAffected: 0,
    fieldRowsAffected: 0,
    constraintRowsAffected: 0,
    skippedTables: [],
  };

  const hasProfileTable = await tableExists(client, 'schema_profile');
  const hasFieldTable = await tableExists(client, 'schema_field');
  const hasConstraintTable = await tableExists(client, 'schema_constraint');
  const profileTableMissing = !hasProfileTable;

  if (profileTableMissing) {
    result.skippedTables.push('schema_profile');
  }
  if (!hasFieldTable) {
    result.skippedTables.push('schema_field');
  }
  if (!hasConstraintTable) {
    result.skippedTables.push('schema_constraint');
  }
  if (profileTableMissing) {
    return result;
  }

  result.profileRowsAffected += getRowsAffected(
    await client.execute({
      sql: `INSERT OR IGNORE INTO schema_profile (
        id,
        name,
        entity_level,
        description,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        seed.profile.id,
        seed.profile.name,
        seed.profile.entityLevel,
        seed.profile.description,
      ],
    }),
  );

  if (hasFieldTable) {
    for (const field of seed.fields) {
      result.fieldRowsAffected += getRowsAffected(
        await client.execute({
          sql: `INSERT OR IGNORE INTO schema_field (
            profile_id,
            entity_type,
            field_key,
            field_type,
            field_config,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          args: [
            seed.profile.id,
            field.entityType,
            field.fieldKey,
            field.fieldType,
            JSON.stringify(field.fieldConfig),
          ],
        }),
      );
    }
  }

  if (hasConstraintTable) {
    for (const [type, requiredFields] of Object.entries(seed.constraints)) {
      result.constraintRowsAffected += getRowsAffected(
        await client.execute({
          sql: `INSERT OR IGNORE INTO schema_constraint (
            profile_id,
            type,
            required_fields,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          args: [seed.profile.id, type, JSON.stringify(requiredFields)],
        }),
      );
    }
  }

  return result;
};
