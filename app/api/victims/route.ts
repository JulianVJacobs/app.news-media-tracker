import { NextResponse } from 'next/server';
import { and, eq, isNull, like, sql, type SQL } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { VictimPayload } from '../../../lib/contracts/plugin-api-contract';
import { dbm, DatabaseManagerServer } from '../../../lib/db/server';
import { victims, type Victim, type NewVictim } from '../../../lib/db/schema';
import { prepareVictimPayload } from '../../../lib/utils/transformers';
import {
  createPluginResource,
  isWorkbenchPluginApiEnabled,
  listPluginResource,
} from '../../../lib/workbench/plugin-api-client';
import { coerceVictim } from './utils';

const ensureServerDatabase = async () => {
  if (!(dbm instanceof DatabaseManagerServer)) {
    throw new TypeError(
      'Online API called with local database manager. This endpoint must run in a server context.',
    );
  }
  await dbm.ensureDatabaseInitialised();
  return dbm.getLocal();
};

const shouldFallbackToLocalApi = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Status: 404') || message.includes('not JSON');
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const articleId = url.searchParams.get('articleId') || '';
    const search = url.searchParams.get('search') || '';
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

    if (isWorkbenchPluginApiEnabled()) {
      try {
        const { items, total } = await listPluginResource<VictimPayload>(
          'victims',
          {
            search,
            eventId: articleId,
            limit,
            offset,
          },
        );

        const data = items.map((item) => ({
          id: item.id,
          articleId: item.eventId,
          victimName: item.name,
        }));
        if (id) {
          const found = data.find((item) => item.id === id) ?? null;
          return NextResponse.json({ success: true, data: found });
        }
        return NextResponse.json({
          success: true,
          data,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
          },
        });
      } catch (error) {
        if (!shouldFallbackToLocalApi(error)) {
          throw error;
        }
        console.warn(
          'Plugin API unavailable for victims; falling back to local database.',
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    const db = await ensureServerDatabase();
    if (id) {
      const existing = await db
        .select()
        .from(victims)
        .where(eq(victims.id, id))
        .limit(1);
      return NextResponse.json({ success: true, data: existing[0] ?? null });
    }

    const whereConditions: SQL[] = [];

    if (url.searchParams.get('includeMerged') !== 'true') {
      whereConditions.push(isNull(victims.mergedIntoId));
    }

    if (articleId) {
      whereConditions.push(eq(victims.articleId, articleId));
    }

    if (search) {
      const wildcard = `%${search}%`;
      const searchConditions = [
        like(victims.victimName, wildcard),
        like(victims.victimAlias, wildcard),
        like(victims.placeOfDeathProvince, wildcard),
        like(victims.placeOfDeathTown, wildcard),
        like(victims.policeStation, wildcard),
      ];

      const [firstCondition, ...remaining] = searchConditions;
      if (firstCondition) {
        const combined = remaining.reduce<SQL>(
          (acc, condition) => sql`${acc} OR ${condition}`,
          firstCondition,
        );
        whereConditions.push(combined);
      }
    }

    const condition = (() => {
      if (whereConditions.length === 0) return undefined;
      if (whereConditions.length === 1) return whereConditions[0];
      return and(...whereConditions);
    })();

    const baseQuery = db.select().from(victims);
    const data = condition
      ? await baseQuery.where(condition).limit(limit).offset(offset)
      : await baseQuery.limit(limit).offset(offset);

    const countColumn = sql<number>`count(*)`.as('count');
    const totalResult = condition
      ? await db.select({ count: countColumn }).from(victims).where(condition)
      : await db.select({ count: countColumn }).from(victims);
    const total = totalResult[0]?.count ?? 0;

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Failed to fetch victims:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve victims',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { data: victimData, validation } = prepareVictimPayload(payload);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 },
      );
    }

    const coerced = coerceVictim(victimData);
    if (!coerced.articleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article ID is required',
          warnings: validation.warnings,
        },
        { status: 400 },
      );
    }

    if (isWorkbenchPluginApiEnabled()) {
      const name =
        (typeof coerced.victimName === 'string' && coerced.victimName.trim()) ||
        (typeof coerced.victimAlias === 'string' && coerced.victimAlias.trim()) ||
        '';

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            error: 'Victim name is required',
            warnings: validation.warnings,
          },
          { status: 400 },
        );
      }

      const created = await createPluginResource<
        Omit<VictimPayload, 'id'>,
        VictimPayload
      >('victims', {
        eventId: coerced.articleId,
        name,
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            id: created.id,
            articleId: created.eventId,
            victimName: created.name,
          },
          message: 'Victim created successfully',
          warnings: validation.warnings,
        },
        { status: 201 },
      );
    }

    const db = await ensureServerDatabase();
    const now = new Date().toISOString();
    const newVictim: NewVictim = {
      id: uuidv4(),
      ...coerced,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'synced',
      failureCount: 0,
      lastSyncAt: now,
    };

    const inserted = await db.insert(victims).values(newVictim).returning();
    const created = inserted[0] as Victim | undefined;

    return NextResponse.json(
      {
        success: true,
        data: created ?? newVictim,
        message: 'Victim created successfully',
        warnings: validation.warnings,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create victim:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create victim',
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const db = await ensureServerDatabase();
    const payload = await request.json();
    const { id } = payload ?? {};

    if (typeof id !== 'string' || !id) {
      return NextResponse.json(
        { success: false, error: 'Victim ID is required' },
        { status: 400 },
      );
    }

    const { data: victimData, validation } = prepareVictimPayload(payload);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.errors,
          warnings: validation.warnings,
        },
        { status: 400 },
      );
    }

    const existing = await db
      .select()
      .from(victims)
      .where(eq(victims.id, id))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json(
        { success: false, error: 'Victim not found' },
        { status: 404 },
      );
    }

    const coercedUpdate = coerceVictim(victimData, existing[0]);
    if (!coercedUpdate.articleId) {
      return NextResponse.json(
        { success: false, error: 'Article ID is required' },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const updated = await db
      .update(victims)
      .set({
        ...coercedUpdate,
        updatedAt: now,
        syncStatus: 'synced',
        failureCount: existing[0].failureCount ?? 0,
        lastSyncAt: now,
      })
      .where(eq(victims.id, id))
      .returning();

    const updatedVictim = updated[0] as Victim | undefined;

    return NextResponse.json({
      success: true,
      data: updatedVictim ?? { ...existing[0], ...coercedUpdate },
      message: 'Victim updated successfully',
      warnings: validation.warnings,
    });
  } catch (error) {
    console.error('Failed to update victim:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update victim',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const db = await ensureServerDatabase();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Victim ID is required' },
        { status: 400 },
      );
    }

    const existing = await db
      .select()
      .from(victims)
      .where(eq(victims.id, id))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json(
        { success: false, error: 'Victim not found' },
        { status: 404 },
      );
    }

    await db.delete(victims).where(eq(victims.id, id));

    return NextResponse.json({
      success: true,
      message: 'Victim deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete victim:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete victim',
      },
      { status: 500 },
    );
  }
}
