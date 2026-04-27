import { and, eq } from 'drizzle-orm';
import {
  SCHEMA_CONSTRAINT_PROFILE_DEFAULT,
  type ConstraintType,
  getDefaultRequiredFields,
} from '../contracts/schema-constraints';
import { schemaConstraints } from './schema';

type LoadedSchemaConstraint = {
  profileId: string;
  type: ConstraintType;
  requiredFields: string[];
};

export type SchemaConstraintDb = {
  select: (...args: unknown[]) => {
    from: (...fromArgs: unknown[]) => {
      where: (...whereArgs: unknown[]) => {
        limit: (
          count: number,
        ) => Promise<Array<{ profileId: string; requiredFields: unknown }>>;
      };
    };
  };
};

const sanitizeRequiredFields = (
  fields: unknown,
  fallbackType: ConstraintType,
): string[] => {
  if (!Array.isArray(fields)) {
    return getDefaultRequiredFields(fallbackType);
  }

  const normalised = fields.reduce<string[]>((acc, field) => {
    if (typeof field !== 'string') {
      return acc;
    }
    const trimmed = field.trim();
    if (trimmed) {
      acc.push(trimmed);
    }
    return acc;
  }, []);

  if (normalised.length === 0) {
    return getDefaultRequiredFields(fallbackType);
  }

  return normalised;
};

const mapConstraint = (
  constraint: { profileId: string; requiredFields: unknown } | undefined,
  fallbackType: ConstraintType,
): LoadedSchemaConstraint | null => {
  if (!constraint) {
    return null;
  }

  return {
    profileId: constraint.profileId,
    type: fallbackType,
    requiredFields: sanitizeRequiredFields(
      constraint.requiredFields,
      fallbackType,
    ),
  };
};

export const loadSchemaConstraints = async (
  db: SchemaConstraintDb,
  profileId: string,
  type: ConstraintType,
): Promise<LoadedSchemaConstraint> => {
  const requested = await db
    .select()
    .from(schemaConstraints)
    .where(
      and(
        eq(schemaConstraints.profileId, profileId),
        eq(schemaConstraints.type, type),
      ),
    )
    .limit(1);
  const profileMatch = mapConstraint(requested[0], type);
  if (profileMatch) {
    return profileMatch;
  }

  const defaults = await db
    .select()
    .from(schemaConstraints)
    .where(
      and(
        eq(schemaConstraints.profileId, SCHEMA_CONSTRAINT_PROFILE_DEFAULT),
        eq(schemaConstraints.type, type),
      ),
    )
    .limit(1);
  const defaultMatch = mapConstraint(defaults[0], type);
  if (defaultMatch) {
    return defaultMatch;
  }

  return {
    profileId: SCHEMA_CONSTRAINT_PROFILE_DEFAULT,
    type,
    requiredFields: getDefaultRequiredFields(type),
  };
};
