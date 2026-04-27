import { useMemo } from 'react';
import {
  PARTICIPANT_FORM_ROLE_VISIBILITY_RULES,
  PARTICIPANT_FORM_VISIBLE_FIELD_GROUPS,
  type ParticipantFieldGroup,
  type ParticipantRole,
  type ParticipantType,
} from '../contracts/participant-form';
import {
  getDefaultRequiredFields,
  type ConstraintType,
} from '../contracts/schema-constraints';

export type RoleProfileContext = {
  role?: string | null;
  profileId?: string | null;
};

export type ProfileVisibilityRules = Partial<
  Record<string, Partial<Record<ParticipantType, readonly ParticipantFieldGroup[]>>>
>;

export type RequiredFieldRules = Partial<
  Record<string, Partial<Record<ConstraintType, readonly string[]>>>
>;

const normalizeRole = (role: string | null | undefined): ParticipantRole | null => {
  if (!role) {
    return null;
  }

  const normalized = role.trim().toLowerCase();
  if (
    normalized === 'admin' ||
    normalized === 'researcher' ||
    normalized === 'editor' ||
    normalized === 'viewer'
  ) {
    return normalized;
  }

  return null;
};

const sanitizeFields = (fields: readonly string[] | undefined): string[] => {
  if (!Array.isArray(fields)) {
    return [];
  }

  const result: string[] = [];
  const seen = new Set<string>();
  for (const field of fields) {
    if (typeof field !== 'string') {
      continue;
    }
    const trimmed = field.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
};

const intersectFields = (left: string[], right: string[]): string[] => {
  if (right.length === 0) {
    return left;
  }

  const rightSet = new Set(right);
  const result = left.filter((item) => rightSet.has(item));
  return result.length > 0 ? result : left;
};

export const resolveVisibleFieldGroups = (
  participantType: ParticipantType,
  context?: RoleProfileContext,
  profileVisibilityRules?: ProfileVisibilityRules,
): string[] => {
  const baseFields = sanitizeFields(
    PARTICIPANT_FORM_VISIBLE_FIELD_GROUPS[participantType],
  );
  const normalizedRole = normalizeRole(context?.role);
  const roleFields = normalizedRole
    ? sanitizeFields(
        PARTICIPANT_FORM_ROLE_VISIBILITY_RULES[normalizedRole]?.[participantType],
      )
    : [];
  const profileFields =
    context?.profileId && profileVisibilityRules
      ? sanitizeFields(
          profileVisibilityRules[context.profileId]?.[participantType],
        )
      : [];

  return intersectFields(intersectFields(baseFields, roleFields), profileFields);
};

export const useRoleFieldVisibility = (
  participantType: ParticipantType,
  context?: RoleProfileContext,
  profileVisibilityRules?: ProfileVisibilityRules,
): string[] =>
  useMemo(
    () => resolveVisibleFieldGroups(participantType, context, profileVisibilityRules),
    [participantType, context, profileVisibilityRules],
  );

export const resolveRequiredConstraintFields = (
  type: ConstraintType,
  context?: RoleProfileContext,
  options?: {
    requiredFields?: readonly string[];
    roleRequiredFieldRules?: Partial<
      Record<ParticipantRole, Partial<Record<ConstraintType, readonly string[]>>>
    >;
    profileRequiredFieldRules?: RequiredFieldRules;
  },
): string[] => {
  const normalizedRole = normalizeRole(context?.role);
  const roleFields = normalizedRole
    ? sanitizeFields(options?.roleRequiredFieldRules?.[normalizedRole]?.[type])
    : [];
  const profileFields =
    context?.profileId && options?.profileRequiredFieldRules
      ? sanitizeFields(
          options.profileRequiredFieldRules[context.profileId]?.[type],
        )
      : [];
  const directOverride = sanitizeFields(options?.requiredFields);

  if (directOverride.length > 0) {
    return directOverride;
  }
  if (profileFields.length > 0) {
    return profileFields;
  }
  if (roleFields.length > 0) {
    return roleFields;
  }

  return getDefaultRequiredFields(type);
};

const isFieldValuePresent = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
};

export const evaluateConstraintState = (
  values: Record<string, unknown>,
  requiredFields: readonly string[],
) => {
  const sanitizedRequiredFields = sanitizeFields(requiredFields);
  const missingRequiredFields = sanitizedRequiredFields.filter(
    (field) => !isFieldValuePresent(values[field]),
  );

  return {
    requiredFields: sanitizedRequiredFields,
    missingRequiredFields,
    isValid: missingRequiredFields.length === 0,
  };
};

export const useConstraintEvaluation = (
  values: Record<string, unknown>,
  type: ConstraintType,
  context?: RoleProfileContext,
  options?: {
    requiredFields?: readonly string[];
    roleRequiredFieldRules?: Partial<
      Record<ParticipantRole, Partial<Record<ConstraintType, readonly string[]>>>
    >;
    profileRequiredFieldRules?: RequiredFieldRules;
  },
) =>
  useMemo(() => {
    const requiredFields = resolveRequiredConstraintFields(type, context, options);
    return evaluateConstraintState(values, requiredFields);
  }, [values, type, context, options]);
