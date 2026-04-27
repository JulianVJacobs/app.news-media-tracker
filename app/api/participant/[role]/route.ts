import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import type {
  ActorPayload,
  PerpetratorPayload,
  VictimPayload,
} from '../../../../lib/contracts/plugin-api-contract';
import { dbm, DatabaseManagerServer } from '../../../../lib/db/server';
import * as schema from '../../../../lib/db/schema';
import {
  createPluginResource,
  isWorkbenchPluginApiEnabled,
  listPluginResource,
} from '../../../../lib/workbench/plugin-api-client';
import { mergeAliasValues, splitAliases } from './utils';

type ParticipantTable =
  | typeof schema.victims
  | typeof schema.perpetrators
  | typeof schema.participants
  | typeof schema.actors;

const pluginResourceByRole = (role: string) => {
  if (role === 'victim') return 'victims' as const;
  if (role === 'perpetrator') return 'perpetrators' as const;
  if (role === 'participant') return 'actors' as const;
  return null;
};

// Dynamic participant API route by role
export async function GET(
  request: NextRequest,
  { params }: { params: { role: string } },
) {
  if (isWorkbenchPluginApiEnabled()) {
    const role = params.role;
    const resource = pluginResourceByRole(role);
    if (!resource) {
      return NextResponse.json(
        { success: false, error: 'Unsupported participant role' },
        { status: 400 },
      );
    }
    const parsedLimit = Number.parseInt(
      request.nextUrl.searchParams.get('limit') || '50',
      10,
    );
    const parsedOffset = Number.parseInt(
      request.nextUrl.searchParams.get('offset') || '0',
      10,
    );
    const limit = Number.isNaN(parsedLimit) ? 50 : parsedLimit;
    const offset = Number.isNaN(parsedOffset) ? 0 : parsedOffset;
    const search = request.nextUrl.searchParams.get('search') || '';

    if (resource === 'victims') {
      const { items } = await listPluginResource<VictimPayload>('victims', {
        search,
        limit,
        offset,
      });
      return NextResponse.json({
        success: true,
        data: items.map((item) => ({
          ...item,
          articleId: item.eventId,
          victimName: item.name,
          role,
        })),
      });
    }

    if (resource === 'perpetrators') {
      const { items } = await listPluginResource<PerpetratorPayload>(
        'perpetrators',
        {
          search,
          limit,
          offset,
        },
      );
      return NextResponse.json({
        success: true,
        data: items.map((item) => ({
          ...item,
          articleId: item.eventId,
          perpetratorName: item.name,
          role,
        })),
      });
    }

    if (resource === 'actors') {
      const { items } = await listPluginResource<ActorPayload>('actors', {
        search,
        limit,
        offset,
      });
      return NextResponse.json({
        success: true,
        data: items.map((item) => ({ ...item, role })),
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported participant role' },
      { status: 400 },
    );
  }

  if (!(dbm instanceof DatabaseManagerServer))
    throw new TypeError(
      'Online API called with local database manager. This endpoint must run in a server context.',
    );
  await dbm.ensureDatabaseInitialised();
  const db = dbm.getLocal();
  const role = params.role;

  // Generalised: use schema[role] if defined, else fallback to participants table
  const roleTableMap: Record<string, ParticipantTable> = {
    victim: schema.victims,
    perpetrator: schema.perpetrators,
    participant: schema.actors,
  };
  const table: ParticipantTable = roleTableMap[role] || schema.participants;
  const participants = (await db.select().from(table)) as Array<
    schema.Participant | schema.Victim | schema.Perpetrator | schema.Actor
  >;
  // Always include id and role in response
  return NextResponse.json({
    success: true,
    data: participants.map((p) => ({
      ...(p as Record<string, unknown>),
      role:
        'role' in p && typeof (p as { role?: unknown }).role === 'string'
          ? (p as { role: string }).role
          : role,
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { role: string } },
) {
  if (isWorkbenchPluginApiEnabled()) {
    const role = params.role;
    const resource = pluginResourceByRole(role);
    if (!resource) {
      return NextResponse.json(
        { success: false, error: 'Unsupported participant role' },
        { status: 400 },
      );
    }
    const body = (await request.json()) as Record<string, unknown>;

    if (resource === 'victims') {
      const created = await createPluginResource<
        Omit<VictimPayload, 'id'>,
        VictimPayload
      >('victims', {
        eventId:
          typeof body.eventId === 'string'
            ? body.eventId
            : typeof body.articleId === 'string'
              ? body.articleId
              : '',
        name:
          typeof body.name === 'string'
            ? body.name
            : typeof body.victimName === 'string'
              ? body.victimName
              : '',
      });
      return NextResponse.json({
        success: true,
        data: {
          ...created,
          articleId: created.eventId,
          victimName: created.name,
          role,
        },
      });
    }

    if (resource === 'perpetrators') {
      const created = await createPluginResource<
        Omit<PerpetratorPayload, 'id'>,
        PerpetratorPayload
      >('perpetrators', {
        eventId:
          typeof body.eventId === 'string'
            ? body.eventId
            : typeof body.articleId === 'string'
              ? body.articleId
              : '',
        name:
          typeof body.name === 'string'
            ? body.name
            : typeof body.perpetratorName === 'string'
              ? body.perpetratorName
              : '',
      });
      return NextResponse.json({
        success: true,
        data: {
          ...created,
          articleId: created.eventId,
          perpetratorName: created.name,
          role,
        },
      });
    }

    if (resource === 'actors') {
      const created = await createPluginResource<
        Omit<ActorPayload, 'id'>,
        ActorPayload
      >('actors', {
        canonicalLabel:
          typeof body.canonicalLabel === 'string'
            ? body.canonicalLabel
            : typeof body.name === 'string'
              ? body.name
              : '',
        actorKind:
          typeof body.actorKind === 'string'
            ? body.actorKind
            : typeof body.role === 'string'
              ? body.role
              : 'unknown',
        aliases: Array.isArray(body.aliases)
          ? body.aliases.filter(
              (entry): entry is string => typeof entry === 'string',
            )
          : [],
      });
      return NextResponse.json({
        success: true,
        data: { ...created, role },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported participant role' },
      { status: 400 },
    );

  }

  if (!(dbm instanceof DatabaseManagerServer))
    throw new TypeError(
      'Online API called with local database manager. This endpoint must run in a server context.',
    );
  await dbm.ensureDatabaseInitialised();
  const db = dbm.getLocal();
  const role = params.role;
  const body = await request.json();

  const roleTableMap: Record<string, ParticipantTable> = {
    victim: schema.victims,
    perpetrator: schema.perpetrators,
    participant: schema.actors,
  };
  const table: ParticipantTable = roleTableMap[role] || schema.participants;
  const result = (await db.insert(table).values(body).returning()) as Array<
    schema.Participant | schema.Victim | schema.Perpetrator | schema.Actor
  >;
  // Handle both array and ResultSet cases
  const participantRecord = Array.isArray(result) ? result[0] : null;
  const inserted = participantRecord
    ? {
        ...(participantRecord as Record<string, unknown>),
        role:
          'role' in participantRecord &&
          typeof (participantRecord as { role?: unknown }).role === 'string'
            ? (participantRecord as { role: string }).role
            : role,
      }
    : null;
  // Always include id and role in response
  return NextResponse.json({ success: true, data: inserted });
}

type SupportedRole = 'victim' | 'perpetrator';

type RoleConfig = {
  table: typeof schema.victims | typeof schema.perpetrators;
  nameField: 'victimName' | 'perpetratorName';
  aliasField: 'victimAlias' | 'perpetratorAlias';
};

const roleConfigMap: Record<SupportedRole, RoleConfig> = {
  victim: {
    table: schema.victims,
    nameField: 'victimName',
    aliasField: 'victimAlias',
  },
  perpetrator: {
    table: schema.perpetrators,
    nameField: 'perpetratorName',
    aliasField: 'perpetratorAlias',
  },
};

const resolveRoleConfig = (role: string): RoleConfig | null =>
  role === 'victim' || role === 'perpetrator' ? roleConfigMap[role] : null;

export async function PUT(
  request: NextRequest,
  { params }: { params: { role: string } },
) {
  if (!(dbm instanceof DatabaseManagerServer))
    throw new TypeError(
      'Online API called with local database manager. This endpoint must run in a server context.',
    );
  await dbm.ensureDatabaseInitialised();
  const db = dbm.getLocal();
  const roleConfig = resolveRoleConfig(params.role);

  if (!roleConfig) {
    return NextResponse.json(
      { success: false, error: 'Unsupported participant role' },
      { status: 400 },
    );
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const action = payload.action;
  const now = new Date().toISOString();
  const table = roleConfig.table;
  const nameField = roleConfig.nameField;
  const aliasField = roleConfig.aliasField;

  if (action === 'promote-alias') {
    const id = typeof payload.id === 'string' ? payload.id : '';
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Participant ID is required' },
        { status: 400 },
      );
    }

    const existingRows = await db
      .select()
      .from(table)
      .where(eq(table.id, id))
      .limit(1);
    const existing = existingRows[0] as Record<string, unknown> | undefined;

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Participant not found' },
        { status: 404 },
      );
    }

    const explicitAlias =
      typeof payload.alias === 'string' ? payload.alias.trim() : '';
    const existingAliases = splitAliases((existing[aliasField] as string) ?? null);
    // If caller does not provide an explicit alias, promote the first stored alias.
    // When no stored alias exists, candidateAlias becomes empty and is rejected below.
    const candidateAlias = explicitAlias || (existingAliases[0] ?? '');

    if (!candidateAlias) {
      return NextResponse.json(
        { success: false, error: 'Alias is required for promotion' },
        { status: 400 },
      );
    }

    const currentPrimary =
      typeof existing[nameField] === 'string' ? (existing[nameField] as string) : null;

    const updatedAlias = mergeAliasValues(
      (existing[aliasField] as string | null | undefined) ?? null,
      currentPrimary ? [currentPrimary] : [],
      [candidateAlias],
    );

    const promotionAudit = {
      action: 'promote-alias',
      promotedAt: now,
      previousPrimaryName: currentPrimary,
      promotedAlias: candidateAlias,
      previousAlias: existing[aliasField] ?? null,
      reason: typeof payload.reason === 'string' ? payload.reason.trim() : null,
    };

    const updatedRows = await db
      .update(table)
      .set({
        [nameField]: candidateAlias,
        [aliasField]: updatedAlias,
        updatedAt: now,
        syncStatus: 'pending',
        lastSyncAt: null,
        promotionAudit,
      } as Record<string, unknown>)
      .where(eq(table.id, id))
      .returning();
    const updated = updatedRows[0];
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Participant promotion failed' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updated ?? null,
      audit: promotionAudit,
    });
  }

  if (action === 'merge') {
    const sourceId = typeof payload.sourceId === 'string' ? payload.sourceId : '';
    const targetId = typeof payload.targetId === 'string' ? payload.targetId : '';

    if (!sourceId || !targetId) {
      return NextResponse.json(
        { success: false, error: 'sourceId and targetId are required' },
        { status: 400 },
      );
    }
    if (sourceId === targetId) {
      return NextResponse.json(
        { success: false, error: 'sourceId and targetId must be different' },
        { status: 400 },
      );
    }

    const [sourceRows, targetRows] = await Promise.all([
      db.select().from(table).where(eq(table.id, sourceId)).limit(1),
      db.select().from(table).where(eq(table.id, targetId)).limit(1),
    ]);
    const source = sourceRows[0] as Record<string, unknown> | undefined;
    const target = targetRows[0] as Record<string, unknown> | undefined;

    if (!source || !target) {
      return NextResponse.json(
        { success: false, error: 'Source or target participant not found' },
        { status: 404 },
      );
    }

    const sourcePrimary =
      typeof source[nameField] === 'string' ? (source[nameField] as string) : null;
    const sourceAlias = (source[aliasField] as string | null | undefined) ?? null;
    const targetPrimary =
      typeof target[nameField] === 'string' ? (target[nameField] as string) : null;

    const mergedAlias = mergeAliasValues(
      (target[aliasField] as string | null | undefined) ?? null,
      [sourcePrimary, sourceAlias],
      // Exclude target primary name so it does not appear in the merged alias list.
      [targetPrimary],
    );

    const mergeAudit = {
      action: 'merge',
      mergedAt: now,
      sourceId,
      targetId,
      sourcePrimaryName: sourcePrimary,
      sourceAlias,
      targetAliasBefore: target[aliasField] ?? null,
      reason: typeof payload.reason === 'string' ? payload.reason.trim() : null,
    };

    const mergedTarget = await db.transaction(async (tx) => {
      await tx
        .update(table)
        .set({
          [aliasField]: mergedAlias,
          updatedAt: now,
          syncStatus: 'pending',
          lastSyncAt: null,
          mergeAudit,
        } as Record<string, unknown>)
        .where(eq(table.id, targetId));

      await tx
        .update(table)
        .set({
          mergedIntoId: targetId,
          mergedAt: now,
          updatedAt: now,
          syncStatus: 'pending',
          lastSyncAt: null,
          mergeAudit,
        } as Record<string, unknown>)
        .where(eq(table.id, sourceId));

      const [targetRow] = await tx
        .select()
        .from(table)
        .where(eq(table.id, targetId))
        .limit(1);
      return targetRow;
    });

    return NextResponse.json({
      success: true,
      data: mergedTarget ?? null,
      audit: mergeAudit,
    });
  }

  return NextResponse.json(
    { success: false, error: 'Unsupported action' },
    { status: 400 },
  );
}
