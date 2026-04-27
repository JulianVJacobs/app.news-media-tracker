import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { dbm, DatabaseManagerServer } from '../../../../../lib/db/server';
import { claims, eventActorRoles, schemaFields } from '../../../../../lib/db/schema';
import {
  CLAIM_VALUE_TYPES,
  CONFIDENCE_MAX,
  CONFIDENCE_MIN,
} from '../../../../../lib/db/domain-constants';

const VALUE_TYPES = new Set(CLAIM_VALUE_TYPES);

const ensureServerDatabase = async () => {
  if (!(dbm instanceof DatabaseManagerServer)) {
    throw new TypeError(
      'Online API called with local database manager. This endpoint must run in a server context.',
    );
  }
  await dbm.ensureDatabaseInitialised();
  return dbm.getLocal();
};

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const db = await ensureServerDatabase();
    const roleId = params.id;

    const data = await db
      .select()
      .from(claims)
      .where(
        and(eq(claims.subjectType, 'event_actor_role'), eq(claims.subjectId, roleId)),
      );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch role claims:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve role claims' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const db = await ensureServerDatabase();
    const roleId = params.id;
    const payload = (await request.json()) as Record<string, unknown>;

    if (typeof payload.predicateKey !== 'string') {
      return NextResponse.json(
        { success: false, error: 'predicateKey must be a string' },
        { status: 400 },
      );
    }

    if (typeof payload.valueType !== 'string') {
      return NextResponse.json(
        { success: false, error: 'valueType must be a string' },
        { status: 400 },
      );
    }

    const predicateKey = payload.predicateKey.trim();
    const valueType = payload.valueType.trim();
    const confidence =
      payload.confidence === null || payload.confidence === undefined
        ? null
        : Number(payload.confidence);
    const schemaFieldId =
      typeof payload.schemaFieldId === 'string'
        ? payload.schemaFieldId.trim()
        : null;

    if (!predicateKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'predicateKey is required',
        },
        { status: 400 },
      );
    }

    if (!VALUE_TYPES.has(valueType)) {
      return NextResponse.json(
        {
          success: false,
          error: `valueType must be one of: ${CLAIM_VALUE_TYPES.join(', ')}`,
        },
        { status: 400 },
      );
    }

    if (
      confidence !== null &&
      (!Number.isInteger(confidence) ||
        confidence < CONFIDENCE_MIN ||
        confidence > CONFIDENCE_MAX)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `confidence must be an integer between ${CONFIDENCE_MIN} and ${CONFIDENCE_MAX}`,
        },
        { status: 400 },
      );
    }

    const roleExists = await db
      .select()
      .from(eventActorRoles)
      .where(eq(eventActorRoles.id, roleId))
      .limit(1);

    if (!roleExists[0]) {
      return NextResponse.json(
        { success: false, error: 'Role assignment not found' },
        { status: 404 },
      );
    }

    if (schemaFieldId) {
      const fieldExists = await db
        .select()
        .from(schemaFields)
        .where(eq(schemaFields.id, schemaFieldId))
        .limit(1);
      if (!fieldExists[0]) {
        return NextResponse.json(
          { success: false, error: 'schemaFieldId does not reference an existing field' },
          { status: 400 },
        );
      }
    }

    const now = new Date().toISOString();
    const inserted = await db
      .insert(claims)
      .values({
        id: uuidv4(),
        subjectType: 'event_actor_role',
        subjectId: roleId,
        predicateKey,
        valueJson: payload.valueJson ?? null,
        valueType,
        confidence,
        assertedBy:
          typeof payload.assertedBy === 'string' ? payload.assertedBy.trim() : null,
        assertedAt:
          typeof payload.assertedAt === 'string' ? payload.assertedAt : now,
        schemaFieldId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(
      { success: true, data: inserted[0] ?? null },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create role claim:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create role claim' },
      { status: 500 },
    );
  }
}
