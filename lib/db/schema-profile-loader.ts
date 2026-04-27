import { and, eq } from 'drizzle-orm';
import { SCHEMA_PROFILE_DEFAULT } from '../contracts/schema-profile';
import { schemaFields, schemaProfiles } from './schema';

type LoadedSchemaProfile = {
  id: string;
  name: string;
  entityLevel: string;
  description: string | null;
  fields: Array<{
    fieldKey: string;
    fieldType: string;
    fieldConfig: unknown;
  }>;
};

export type SchemaProfileDb = {
  select: (...args: unknown[]) => {
    from: (...fromArgs: unknown[]) => {
      where: (...whereArgs: unknown[]) => {
        limit: (count: number) => Promise<Array<unknown>>;
      };
    };
  };
};

const mapProfile = (
  row:
    | {
        id: string;
        name: string;
        entityLevel: string;
        description: string | null;
      }
    | undefined,
): Omit<LoadedSchemaProfile, 'fields'> | null => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    entityLevel: row.entityLevel,
    description: row.description,
  };
};

export const loadSchemaProfile = async (
  db: SchemaProfileDb,
  profileId: string,
  entityLevel: string,
): Promise<LoadedSchemaProfile | null> => {
  const requested = (await db
    .select()
    .from(schemaProfiles)
    .where(
      and(
        eq(schemaProfiles.id, profileId),
        eq(schemaProfiles.entityLevel, entityLevel),
      ),
    )
    .limit(1)) as Array<{
    id: string;
    name: string;
    entityLevel: string;
    description: string | null;
  }>;
  const profile = mapProfile(requested[0]);

  const fallback = (await db
    .select()
    .from(schemaProfiles)
    .where(
      and(
        eq(schemaProfiles.id, SCHEMA_PROFILE_DEFAULT),
        eq(schemaProfiles.entityLevel, entityLevel),
      ),
    )
    .limit(1)) as Array<{
    id: string;
    name: string;
    entityLevel: string;
    description: string | null;
  }>;
  const defaultProfile = mapProfile(fallback[0]);

  const resolved = profile ?? defaultProfile;
  if (!resolved) {
    return null;
  }

  const fields = (await db
    .select({
      fieldKey: schemaFields.fieldKey,
      fieldType: schemaFields.fieldType,
      fieldConfig: schemaFields.fieldConfig,
    })
    .from(schemaFields)
    .where(eq(schemaFields.profileId, resolved.id))
    .limit(1000)) as Array<{
    fieldKey: string;
    fieldType: string;
    fieldConfig: unknown;
  }>;

  return {
    ...resolved,
    fields,
  };
};
