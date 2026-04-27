import { type Event, type Perpetrator, type Victim } from '../db/schema';

type JsonRecord = Record<string, unknown>;

export interface EventActor {
  actor_id: string;
  canonical_label: string;
  aliases: string[];
  identifiers: Array<{ kind: string; value: string }>;
  legacy: {
    source_table: 'victims' | 'perpetrators';
    source_id: string;
    article_id: string;
  };
}

export interface EventActorRole {
  event_id: string;
  actor_id: string;
  role_term: string;
  confidence: number;
  certainty: 'confirmed' | 'probable' | 'possible';
  is_primary: boolean;
}

export interface EventClaim {
  subject_type: 'event' | 'actor' | 'role';
  subject_id: string;
  predicate: string;
  value: string;
  evidence_references: string[];
}

const asObject = (value: unknown): JsonRecord =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};

const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const splitAliases = (value: string | null): string[] => {
  if (!value) {
    return [];
  }
  const seen = new Set<string>();
  const tokens = value
    .split(/\s*[|,]\s*/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .filter((token) => {
      const key = token.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  return tokens;
};

const filterCanonicalAlias = (
  aliases: string[],
  canonicalLabel: string,
): string[] => {
  const canonicalKey = canonicalLabel.toLowerCase();
  return aliases.filter((alias) => alias.toLowerCase() !== canonicalKey);
};

const pickCanonicalLabel = (
  primaryName: string | null,
  aliases: string[],
): string => {
  const trimmed = primaryName?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  const aliasLabel = aliases[0]?.trim();
  return aliasLabel && aliasLabel.length > 0 ? aliasLabel : 'Unknown';
};

const buildVictimActor = (victim: Victim): EventActor => {
  const aliases = splitAliases(victim.victimAlias ?? null);
  const canonicalLabel = pickCanonicalLabel(victim.victimName ?? null, aliases);
  return {
    actor_id: victim.id,
    canonical_label: canonicalLabel,
    // Keep canonical label as the single primary value and retain only distinct alternates.
    // If canonical_label came from aliases[0], this intentionally removes that alias duplicate.
    aliases: filterCanonicalAlias(aliases, canonicalLabel),
    identifiers: [{ kind: 'legacy_record_id', value: victim.id }],
    legacy: {
      source_table: 'victims',
      source_id: victim.id,
      article_id: victim.articleId,
    },
  };
};

const buildPerpetratorActor = (perpetrator: Perpetrator): EventActor => {
  const aliases = splitAliases(perpetrator.perpetratorAlias ?? null);
  const canonicalLabel = pickCanonicalLabel(
    perpetrator.perpetratorName ?? null,
    aliases,
  );
  return {
    actor_id: perpetrator.id,
    canonical_label: canonicalLabel,
    // Keep canonical label as the single primary value and retain only distinct alternates.
    // If canonical_label came from aliases[0], this intentionally removes that alias duplicate.
    aliases: filterCanonicalAlias(aliases, canonicalLabel),
    identifiers: [{ kind: 'legacy_record_id', value: perpetrator.id }],
    legacy: {
      source_table: 'perpetrators',
      source_id: perpetrator.id,
      article_id: perpetrator.articleId,
    },
  };
};

const normaliseRole = (
  eventId: string,
  role: unknown,
): EventActorRole | null => {
  const record = asObject(role);
  if (typeof record.actor_id !== 'string' || record.actor_id.length === 0) {
    return null;
  }

  const confidence =
    typeof record.confidence === 'number'
      ? record.confidence
      : typeof record.confidence === 'string'
        ? Number.parseFloat(record.confidence)
        : 1;

  const certainty =
    record.certainty === 'possible' || record.certainty === 'probable'
      ? record.certainty
      : 'confirmed';

  return {
    event_id:
      typeof record.event_id === 'string' && record.event_id.length > 0
        ? record.event_id
        : eventId,
    actor_id: record.actor_id,
    role_term:
      typeof record.role_term === 'string' && record.role_term.length > 0
        ? record.role_term
        : 'other',
    confidence: Number.isFinite(confidence) ? confidence : 1,
    certainty,
    is_primary: Boolean(record.is_primary),
  };
};

const normaliseClaim = (claim: unknown): EventClaim | null => {
  const record = asObject(claim);
  const subjectType =
    record.subject_type === 'actor' || record.subject_type === 'role'
      ? record.subject_type
      : record.subject_type === 'event'
        ? 'event'
        : null;

  if (
    !subjectType ||
    typeof record.subject_id !== 'string' ||
    typeof record.predicate !== 'string' ||
    typeof record.value !== 'string'
  ) {
    return null;
  }

  return {
    subject_type: subjectType,
    subject_id: record.subject_id,
    predicate: record.predicate,
    value: record.value,
    evidence_references: asArray(record.evidence_references).filter(
      (value): value is string => typeof value === 'string',
    ),
  };
};

export interface IntegratedEventPayload {
  event: Event;
  actors: EventActor[];
  event_actor_roles: EventActorRole[];
  claims: EventClaim[];
}

export const buildIntegratedEventPayload = (
  event: Event,
  victims: Victim[],
  perpetrators: Perpetrator[],
): IntegratedEventPayload => {
  const actors = [
    ...victims.map(buildVictimActor),
    ...perpetrators.map(buildPerpetratorActor),
  ];
  const actorIds = new Set(actors.map((actor) => actor.actor_id));
  const details = asObject(event.details);
  // Accept both contract (`event_actor_roles`) and prior camelCase payloads.
  const rawRoles = asArray(details.event_actor_roles ?? details.eventActorRoles);
  const explicitRoles = rawRoles
    .map((role) => normaliseRole(event.id, role))
    .filter((role): role is EventActorRole => Boolean(role))
    .filter((role) => actorIds.has(role.actor_id));

  const defaultRoles = [
    ...victims.map((victim) => ({
      event_id: event.id,
      actor_id: victim.id,
      role_term: 'victim',
      confidence: 1,
      certainty: 'confirmed' as const,
      is_primary: true,
    })),
    ...perpetrators.map((perpetrator) => ({
      event_id: event.id,
      actor_id: perpetrator.id,
      role_term: 'perpetrator',
      confidence: 1,
      certainty: 'confirmed' as const,
      is_primary: true,
    })),
  ];

  const eventActorRoles = explicitRoles.length > 0 ? explicitRoles : defaultRoles;
  const claims = asArray(details.claims)
    .map(normaliseClaim)
    .filter((claim): claim is EventClaim => Boolean(claim));

  return {
    event,
    actors,
    event_actor_roles: eventActorRoles,
    claims,
  };
};
