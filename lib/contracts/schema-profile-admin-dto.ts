import { z } from 'zod';

const optionalTrimmedString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const profileCreateSchema = z.object({
  id: optionalTrimmedString,
  name: z
    .string({ required_error: 'name is required' })
    .trim()
    .min(1, 'name is required'),
  entityLevel: z
    .string({ required_error: 'entityLevel is required' })
    .trim()
    .min(1, 'entityLevel is required'),
  description: optionalTrimmedString,
});

const profileUpdateSchema = z
  .object({
    id: z
      .string({ required_error: 'id is required' })
      .trim()
      .min(1, 'id is required'),
    name: optionalTrimmedString,
    entityLevel: optionalTrimmedString,
    description: optionalTrimmedString,
  })
  .superRefine((value, context) => {
    if (
      value.name === null &&
      value.entityLevel === null &&
      value.description === null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'At least one of name, entityLevel, or description must be provided',
      });
    }
  });

const profileDeleteSchema = z.object({
  id: z
    .string({ required_error: 'id is required' })
    .trim()
    .min(1, 'id is required'),
});

const getErrorMessages = (error: z.ZodError): string[] =>
  error.issues.map((issue) => issue.message);

const normalisePayload = (payload: unknown): Record<string, unknown> => {
  const input =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : {};
  return {
    id: input.id,
    name: input.name,
    entityLevel: input.entityLevel ?? input.entity_level ?? null,
    description: input.description,
  };
};

export const parseProfileCreateDto = (
  payload: unknown,
): { success: true; data: z.infer<typeof profileCreateSchema> } | {
  success: false;
  errors: string[];
} => {
  const parsed = profileCreateSchema.safeParse(normalisePayload(payload));
  if (!parsed.success) {
    return { success: false, errors: getErrorMessages(parsed.error) };
  }
  return { success: true, data: parsed.data };
};

export const parseProfileUpdateDto = (
  payload: unknown,
): { success: true; data: z.infer<typeof profileUpdateSchema> } | {
  success: false;
  errors: string[];
} => {
  const parsed = profileUpdateSchema.safeParse(normalisePayload(payload));
  if (!parsed.success) {
    return { success: false, errors: getErrorMessages(parsed.error) };
  }
  return { success: true, data: parsed.data };
};

export const parseProfileDeleteDto = (
  payload: unknown,
): { success: true; data: z.infer<typeof profileDeleteSchema> } | {
  success: false;
  errors: string[];
} => {
  const parsed = profileDeleteSchema.safeParse(normalisePayload(payload));
  if (!parsed.success) {
    return { success: false, errors: getErrorMessages(parsed.error) };
  }
  return { success: true, data: parsed.data };
};
