import { NextResponse } from 'next/server';
import { and, eq, inArray, like, or, sql, type SQL } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { ActorPayload } from '../../../lib/contracts/plugin-api-contract';
import { dbm, DatabaseManagerServer } from '../../../lib/db/server';
import {
  actors,
  actorAliases,
  actorIdentifiers,
  type Actor,
  type ActorAlias,
  type ActorIdentifier,
  type NewActor,
  type NewActorAlias,
  type NewActorIdentifier,
} from '../../../lib/db/schema';
import {
  createPluginResource,
  isWorkbenchPluginApiEnabled,
  listPluginResource,
} from '../../../lib/workbench/plugin-api-client';
import { splitAliases } from '../participant/[role]/utils';

const ensureServerDatabase = async () => {
  if (!(dbm instanceof DatabaseManagerServer)) {
    throw new TypeError(
      'Online API called with local database manager. This endpoint must run in a server context.',
    );
  }
  await dbm.ensureDatabaseInitialised();
  return dbm.getLocal();
};

const toActorResponse = (
  actor: Actor,
  aliases: ActorAlias[],
  identifiers: ActorIdentifier[],
) => ({
  ...actor,
  aliases: aliases.map((alias) => alias.aliasValue),
  identifiers: identifiers.map((identifier) => ({
    namespace: identifier.namespace,
    value: identifier.value,
    isPrimary: identifier.isPrimary ?? false,
  })),
});

const normaliseAliasInput = (rawAliases: unknown): string[] => {
  const rawValues = Array.isArray(rawAliases)
    ? rawAliases
    : typeof rawAliases === 'string'
      ? splitAliases(rawAliases)
      : [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of rawValues) {
    const alias = typeof value === 'string' ? value.trim() : '';
    if (!alias) continue;
    const key = alias.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(alias);
  }
  return normalized;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = (url.searchParams.get('search') || '').trim();
    const parsedLimit = Number.parseInt(
      url.searchParams.get('limit') || '50',
      10,
    );
    const parsedOffset = Number.parseInt(
      url.searchParams.get('offset') || '0',
      10,
    );
    const limit = Number.isNaN(parsedLimit) ? 50 : parsedLimit;
    const offset = Number.isNaN(parsedOffset) ? 0 : parsedOffset;
    const status = (url.searchParams.get('status') || '').trim();

    if (isWorkbenchPluginApiEnabled()) {
      const { items } = await listPluginResource<ActorPayload>('actors', {
        search,
        status,
        limit,
        offset,
      });
      return NextResponse.json({
        success: true,
        data: items.map((item) => ({
          ...item,
          status:
            typeof (item as unknown as Record<string, unknown>).status ===
            'string'
              ? (item as unknown as Record<string, string>).status
              : 'active',
          schemaProfileId:
            typeof (item as unknown as Record<string, unknown>)
              .schemaProfileId === 'string'
              ? (item as unknown as Record<string, string>).schemaProfileId
              : null,
          identifiers: [
            {
              namespace: 'primary_name',
              value: item.canonicalLabel,
              isPrimary: true,
            },
          ],
        })),
      });
    }

    const db = await ensureServerDatabase();
    const whereConditions: SQL[] = [];
    if (status) {
      whereConditions.push(eq(actors.status, status));
    }
    if (search) {
      const wildcard = `%${search}%`;
      whereConditions.push(
        or(
          like(actors.canonicalLabel, wildcard),
          sql`EXISTS (SELECT 1 FROM actor_alias aa WHERE aa.actor_id = ${actors.id} AND aa.alias_value LIKE ${wildcard})`,
        ) as SQL,
      );
    }

    const condition = (() => {
      if (whereConditions.length === 0) return undefined;
      if (whereConditions.length === 1) return whereConditions[0];
      return and(...whereConditions);
    })();

    const baseQuery = db.select().from(actors);
    const rows = condition
      ? await baseQuery.where(condition).limit(limit).offset(offset)
      : await baseQuery.limit(limit).offset(offset);

    const actorIds = rows.map((row) => row.id);
    const [aliases, identifiers] =
      actorIds.length > 0
        ? await Promise.all([
            db
              .select()
              .from(actorAliases)
              .where(inArray(actorAliases.actorId, actorIds)),
            db
              .select()
              .from(actorIdentifiers)
              .where(inArray(actorIdentifiers.actorId, actorIds)),
          ])
        : [[], []];

    const aliasByActor = new Map<string, ActorAlias[]>();
    for (const alias of aliases) {
      const current = aliasByActor.get(alias.actorId) ?? [];
      current.push(alias);
      aliasByActor.set(alias.actorId, current);
    }

    const identifierByActor = new Map<string, ActorIdentifier[]>();
    for (const identifier of identifiers) {
      const current = identifierByActor.get(identifier.actorId) ?? [];
      current.push(identifier);
      identifierByActor.set(identifier.actorId, current);
    }

    return NextResponse.json({
      success: true,
      data: rows.map((row) =>
        toActorResponse(
          row,
          aliasByActor.get(row.id) ?? [],
          identifierByActor.get(row.id) ?? [],
        ),
      ),
    });
  } catch (error) {
    console.error('Failed to fetch actors:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve actors' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const canonicalLabel =
      typeof payload.canonicalLabel === 'string'
        ? payload.canonicalLabel.trim()
        : typeof payload.canonical_label === 'string'
          ? payload.canonical_label.trim()
          : '';

    if (!canonicalLabel) {
      return NextResponse.json(
        { success: false, error: 'canonical_label is required' },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const id = uuidv4();
    const actorKind =
      typeof payload.actorKind === 'string'
        ? payload.actorKind
        : typeof payload.actor_kind === 'string'
          ? payload.actor_kind
          : 'unknown';
    const status =
      typeof payload.status === 'string' && payload.status
        ? payload.status
        : 'active';
    const schemaProfileId =
      typeof payload.schemaProfileId === 'string'
        ? payload.schemaProfileId
        : typeof payload.schema_profile_id === 'string'
          ? payload.schema_profile_id
          : null;

    const actorRecord: NewActor = {
      id,
      canonicalLabel,
      actorKind,
      status,
      schemaProfileId,
      createdAt: now,
      updatedAt: now,
    };
    const aliasValues = normaliseAliasInput(payload.aliases);

    if (isWorkbenchPluginApiEnabled()) {
      const created = await createPluginResource<
        Omit<ActorPayload, 'id'>,
        ActorPayload
      >('actors', {
        canonicalLabel,
        actorKind,
        aliases: aliasValues,
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            ...created,
            status,
            schemaProfileId,
            identifiers: [
              {
                namespace: 'primary_name',
                value: created.canonicalLabel,
                isPrimary: true,
              },
            ],
          },
        },
        { status: 201 },
      );
    }

    const db = await ensureServerDatabase();
    const aliasRows: NewActorAlias[] = aliasValues.map((alias) => ({
      id: uuidv4(),
      actorId: id,
      aliasValue: alias,
      aliasNormalized: alias.toLowerCase(),
      isPrimary: false,
      createdAt: now,
      updatedAt: now,
    }));
    const identifierRows: NewActorIdentifier[] = [
      {
        id: `primary_name:${id}`,
        actorId: id,
        namespace: 'primary_name',
        value: canonicalLabel,
        isPrimary: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const createdActor = await db.transaction(async (tx) => {
      const insertedActors = await tx
        .insert(actors)
        .values(actorRecord)
        .returning();
      if (aliasRows.length > 0) {
        await tx.insert(actorAliases).values(aliasRows);
      }
      await tx.insert(actorIdentifiers).values(identifierRows);
      return insertedActors[0] ?? actorRecord;
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...createdActor,
          aliases: aliasRows.map((alias) => alias.aliasValue),
          identifiers: identifierRows.map((identifier) => ({
            namespace: identifier.namespace,
            value: identifier.value,
            isPrimary: identifier.isPrimary ?? false,
          })),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create actor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create actor' },
      { status: 500 },
    );
  }
}
