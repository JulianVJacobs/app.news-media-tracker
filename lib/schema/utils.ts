import { z, ZodTypeAny, ZodRawShape } from 'zod';

interface BaseSchemaDefinition {
  optional?: boolean;
}

type PrimitiveSchemaDefinition =
  | (BaseSchemaDefinition & { type: 'string' })
  | (BaseSchemaDefinition & { type: 'number' })
  | (BaseSchemaDefinition & { type: 'boolean' });

interface ArraySchemaDefinition extends BaseSchemaDefinition {
  type: 'array';
  items: SchemaDefinition;
}

interface ObjectSchemaDefinition extends BaseSchemaDefinition {
  type: 'object';
  properties: Record<string, SchemaDefinition>;
}

interface UnknownSchemaDefinition extends BaseSchemaDefinition {
  type?: 'any';
  [key: string]: unknown;
}

export type SchemaDefinition =
  | PrimitiveSchemaDefinition
  | ArraySchemaDefinition
  | ObjectSchemaDefinition
  | UnknownSchemaDefinition;

// Supported types: string, number, boolean, array, object
export function generateSchema(schemaObj: SchemaDefinition): ZodTypeAny {
  switch (schemaObj.type) {
    case 'string':
      return schemaObj.optional ? z.string().optional() : z.string();
    case 'number':
      return schemaObj.optional ? z.number().optional() : z.number();
    case 'boolean':
      return schemaObj.optional ? z.boolean().optional() : z.boolean();
    case 'array':
      return schemaObj.optional
        ? z.array(generateSchema(schemaObj.items)).optional()
        : z.array(generateSchema(schemaObj.items));
    case 'object': {
      const shapeEntries = Object.entries(schemaObj.properties).map(
        ([key, value]) => [key, generateSchema(value)] as const,
      );
      const shape = Object.fromEntries(shapeEntries) as Record<
        string,
        ZodTypeAny
      >;
      const objectSchema = z.object(shape);
      return schemaObj.optional ? objectSchema.optional() : objectSchema;
    }
    default:
      return schemaObj.optional ? z.any().optional() : z.any();
  }
}

/**
 * Dynamically merge any composable object schemas for requested types.
 * @param types Array of type names (e.g., ['homicide', 'robbery'])
 * @param schemaMap Object mapping type names to schema objects (e.g., imported templates)
 */
export function getMergedObjectSchema(
  types: string[],
  schemaMap: Record<string, SchemaDefinition>,
): ZodTypeAny {
  let merged: z.ZodObject<ZodRawShape> = z.object({});
  for (const type of types) {
    const schemaDefinition = schemaMap[type];
    if (!schemaDefinition) {
      continue;
    }
    const candidate = generateSchema(schemaDefinition);
    // Only merge if candidate is a ZodObject
    if (candidate instanceof z.ZodObject) {
      merged = merged.merge(candidate as z.ZodObject<ZodRawShape>);
    }
  }
  return merged;
}

/**
 * Validate only the top-level schemaObj for required fields and structure.
 * Throws an error if invalid. Does NOT recurse.
 */
export function validateSchemaObj(
  schemaObj: Record<string, unknown>,
  path = '',
): void {
  if (typeof schemaObj !== 'object' || schemaObj === null) {
    throw new Error(`Schema at ${path || 'root'} is not an object.`);
  }
  if (!('type' in schemaObj)) {
    throw new Error(`Missing 'type' at ${path || 'root'}`);
  }
  if (!('optional' in schemaObj)) {
    throw new Error(`Missing 'optional' at ${path || 'root'}`);
  }
  // For arrays, must have items
  if (schemaObj.type === 'array' && !('items' in schemaObj)) {
    throw new Error(`Array schema at ${path || 'root'} missing 'items'.`);
  }
  // For objects, must have properties
  if (schemaObj.type === 'object' && !('properties' in schemaObj)) {
    throw new Error(`Object schema at ${path || 'root'} missing 'properties'.`);
  }
}
