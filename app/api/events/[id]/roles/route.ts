import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { dbm, DatabaseManagerServer } from '../../../../../lib/db/server';
import {
  annotationEvents,
  actors,
  eventActorRoles,
  schemaVocabTerms,
} from '../../../../../lib/db/schema';
import {
  CONFIDENCE_MAX,
  CONFIDENCE_MIN,
  EVENT_ACTOR_ROLE_CERTAINTY_VALUES,
} from '../../../../../lib/db/domain-constants';
import { EVENT_ACTOR_ROLE_VOCAB_KEY } from '../../../../../lib/db/role-vocabulary';

const CERTAINTY_VALUES = new Set(EVENT_ACTOR_ROLE_CERTAINTY_VALUES);

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
    const eventId = params.id;
    const data = await db
      .select({
        id: eventActorRoles.id,
        eventId: eventActorRoles.eventId,
        actorId: eventActorRoles.actorId,
        roleTermId: eventActorRoles.roleTermId,
        roleTermLabel: schemaVocabTerms.label,
        roleTermKey: schemaVocabTerms.termKey,
        roleScope: eventActorRoles.roleScope,
        confidence: eventActorRoles.confidence,
        certainty: eventActorRoles.certainty,
        isPrimaryRole: eventActorRoles.isPrimaryRole,
        createdAt: eventActorRoles.createdAt,
        updatedAt: eventActorRoles.updatedAt,
      })
      .from(eventActorRoles)
      .leftJoin(
        schemaVocabTerms,
        eq(eventActorRoles.roleTermId, schemaVocabTerms.id),
      )
      .where(eq(eventActorRoles.eventId, eventId));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch event actor roles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve event actor roles' },
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
    const eventId = params.id;
    const payload = (await request.json()) as Record<string, unknown>;

    if (typeof payload.actorId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'actorId must be a string' },
        { status: 400 },
      );
    }

    const actorId = payload.actorId.trim();
    const roleTermId = Number(payload.roleTermId);
    if (
      payload.certainty !== undefined &&
      payload.certainty !== null &&
      typeof payload.certainty !== 'string'
    ) {
      return NextResponse.json(
        { success: false, error: 'certainty must be a string when provided' },
        { status: 400 },
      );
    }

    const certainty =
      typeof payload.certainty === 'string' ? payload.certainty : 'unknown';
    const confidence =
      payload.confidence === null || payload.confidence === undefined
        ? null
        : Number(payload.confidence);

    if (!actorId) {
      return NextResponse.json(
        { success: false, error: 'actorId is required' },
        { status: 400 },
      );
    }

    if (!Number.isInteger(roleTermId)) {
      return NextResponse.json(
        { success: false, error: 'roleTermId must be an integer' },
        { status: 400 },
      );
    }

    if (!CERTAINTY_VALUES.has(certainty)) {
      return NextResponse.json(
        {
          success: false,
          error: `certainty must be one of: ${EVENT_ACTOR_ROLE_CERTAINTY_VALUES.join(', ')}`,
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

    const [eventExists, actorExists, roleTerm] = await Promise.all([
      db.select().from(annotationEvents).where(eq(annotationEvents.id, eventId)).limit(1),
      db.select().from(actors).where(eq(actors.id, actorId)).limit(1),
      db
        .select()
        .from(schemaVocabTerms)
        .where(
          and(
            eq(schemaVocabTerms.id, roleTermId),
            eq(schemaVocabTerms.vocabKey, EVENT_ACTOR_ROLE_VOCAB_KEY),
          ),
        )
        .limit(1),
    ]);

    if (!eventExists[0]) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 },
      );
    }

    if (!actorExists[0]) {
      return NextResponse.json(
        { success: false, error: 'Actor not found' },
        { status: 404 },
      );
    }

    if (!roleTerm[0]) {
      return NextResponse.json(
        { success: false, error: 'Role term not found for event actor roles' },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const inserted = await db
      .insert(eventActorRoles)
      .values({
        id: uuidv4(),
        eventId,
        actorId,
        roleTermId,
        roleScope:
          typeof payload.roleScope === 'string' ? payload.roleScope.trim() : null,
        confidence,
        certainty,
        isPrimaryRole: Boolean(payload.isPrimaryRole),
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(
      { success: true, data: inserted[0] ?? null },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create event actor role:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create event actor role' },
      { status: 500 },
    );
  }
}
