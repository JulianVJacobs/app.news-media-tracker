export const EVENT_ACTOR_ROLE_VOCAB_KEY = 'event_actor_role';

export const DEFAULT_EVENT_ACTOR_ROLE_TERMS = [
  { termKey: 'victim', label: 'Victim' },
  { termKey: 'perpetrator', label: 'Perpetrator' },
  { termKey: 'witness', label: 'Witness' },
  { termKey: 'reporter', label: 'Reporter' },
  { termKey: 'investigator', label: 'Investigator' },
  { termKey: 'judge', label: 'Judge' },
  { termKey: 'prosecutor', label: 'Prosecutor' },
  { termKey: 'community_member', label: 'Community member' },
  { termKey: 'police_officer', label: 'Police officer' },
  { termKey: 'security_guard', label: 'Security guard' },
  { termKey: 'unknown_person', label: 'Unknown person' },
] as const;
