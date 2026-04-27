export const PARTICIPANT_FORM_CONTRACT_VERSION = '2026-04-20';

export type ParticipantType = 'victim' | 'perpetrator' | 'other';
export type ParticipantFieldGroup =
  | 'coreIdentity'
  | 'demographics'
  | 'deathDetails'
  | 'location'
  | 'relationship'
  | 'suspectStatus'
  | 'conviction';
export type ParticipantRole = 'admin' | 'researcher' | 'editor' | 'viewer';

export const PARTICIPANT_FORM_VISIBLE_FIELD_GROUPS: Record<
  ParticipantType,
  readonly ParticipantFieldGroup[]
> = {
  victim: ['coreIdentity', 'demographics', 'deathDetails', 'location'],
  perpetrator: ['coreIdentity', 'relationship', 'suspectStatus', 'conviction'],
  other: ['coreIdentity'],
} as const;

export const PARTICIPANT_FORM_ROLE_VISIBILITY_RULES: Record<
  ParticipantRole,
  Partial<Record<ParticipantType, readonly ParticipantFieldGroup[]>>
> = {
  admin: {},
  researcher: {},
  editor: {
    victim: ['coreIdentity', 'demographics', 'deathDetails', 'location'],
    perpetrator: ['coreIdentity', 'relationship', 'suspectStatus'],
    other: ['coreIdentity'],
  },
  viewer: {
    victim: ['coreIdentity'],
    perpetrator: ['coreIdentity'],
    other: ['coreIdentity'],
  },
} as const;

export const PARTICIPANT_FORM_CONTRACT = {
  version: PARTICIPANT_FORM_CONTRACT_VERSION,
  typeOptions: ['victim', 'perpetrator', 'other'] as const,
  visibleFieldGroups: PARTICIPANT_FORM_VISIBLE_FIELD_GROUPS,
  roleVisibilityRules: PARTICIPANT_FORM_ROLE_VISIBILITY_RULES,
} as const;
