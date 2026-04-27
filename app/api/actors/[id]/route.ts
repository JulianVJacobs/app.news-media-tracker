import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { dbm, DatabaseManagerServer } from '../../../../lib/db/server';
import {
  actors,
  actorAliases,
  actorIdentifiers,
  type Actor,
  type ActorAlias,
  type ActorIdentifier,
} from '../../../../lib/db/schema';

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

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const db = await ensureServerDatabase();
    const id = params.id;

    const [actorRow] = await db.select().from(actors).where(eq(actors.id, id)).limit(1);
    if (!actorRow) {
      return NextResponse.json(
        { success: false, error: 'Actor not found' },
        { status: 404 },
      );
    }

    const [aliases, identifiers] = await Promise.all([
      db.select().from(actorAliases).where(eq(actorAliases.actorId, id)),
      db.select().from(actorIdentifiers).where(eq(actorIdentifiers.actorId, id)),
    ]);

    return NextResponse.json({
      success: true,
      data: toActorResponse(actorRow, aliases, identifiers),
    });
  } catch (error) {
    console.error('Failed to fetch actor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve actor' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const db = await ensureServerDatabase();
    const id = params.id;
    const payload = (await request.json()) as Record<string, unknown>;
    const canonicalLabel =
      typeof payload.canonicalLabel === 'string'
        ? payload.canonicalLabel.trim()
        : typeof payload.canonical_label === 'string'
          ? payload.canonical_label.trim()
          : null;
    const status =
      typeof payload.status === 'string' && payload.status ? payload.status : null;

    if (canonicalLabel === null && status === null) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one of canonical_label or status must be provided',
        },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const updatedActor = await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(actors)
        .where(eq(actors.id, id))
        .limit(1);
      if (!current) {
        return null;
      }

      const [updated] = await tx
        .update(actors)
        .set({
          canonicalLabel: canonicalLabel ?? current.canonicalLabel,
          status: status ?? current.status,
          updatedAt: now,
        })
        .where(eq(actors.id, id))
        .returning();

      if (canonicalLabel !== null) {
        const updatedPrimaryIdentifiers = await tx
          .update(actorIdentifiers)
          .set({
            value: canonicalLabel,
            isPrimary: true,
            updatedAt: now,
          })
          .where(
            and(
              eq(actorIdentifiers.actorId, id),
              eq(actorIdentifiers.namespace, 'primary_name'),
            ),
          )
          .returning();

        if (updatedPrimaryIdentifiers.length === 0) {
          await tx.insert(actorIdentifiers).values({
            id: `primary_name:${id}`,
            actorId: id,
            namespace: 'primary_name',
            value: canonicalLabel,
            isPrimary: true,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      return updated ?? current;
    });

    if (!updatedActor) {
      return NextResponse.json(
        { success: false, error: 'Actor not found' },
        { status: 404 },
      );
    }

    const [aliases, identifiers] = await Promise.all([
      db.select().from(actorAliases).where(eq(actorAliases.actorId, id)),
      db.select().from(actorIdentifiers).where(eq(actorIdentifiers.actorId, id)),
    ]);

    return NextResponse.json({
      success: true,
      data: toActorResponse(updatedActor, aliases, identifiers),
    });
  } catch (error) {
    console.error('Failed to update actor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update actor' },
      { status: 500 },
    );
  }
}
