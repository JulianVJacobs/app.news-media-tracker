import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { dbm, DatabaseManagerServer } from '../../../../../lib/db/server';
import {
  actors,
  actorAliases,
  type NewActorAlias,
} from '../../../../../lib/db/schema';
import {
  joinAliases,
  mergeAliasValues,
  splitAliases,
} from '../../../participant/[role]/utils';

const ensureServerDatabase = async () => {
  if (!(dbm instanceof DatabaseManagerServer)) {
    throw new TypeError(
      'Online API called with local database manager. This endpoint must run in a server context.',
    );
  }
  await dbm.ensureDatabaseInitialised();
  return dbm.getLocal();
};

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const db = await ensureServerDatabase();
    const id = params.id;
    const payload = (await request.json()) as Record<string, unknown>;
    const now = new Date().toISOString();

    const [actor] = await db.select().from(actors).where(eq(actors.id, id)).limit(1);
    if (!actor) {
      return NextResponse.json(
        { success: false, error: 'Actor not found' },
        { status: 404 },
      );
    }

    const aliases = await db
      .select()
      .from(actorAliases)
      .where(eq(actorAliases.actorId, id));
    const aliasValues = aliases.map((entry) => entry.aliasValue);
    const explicitAlias =
      typeof payload.alias === 'string' ? payload.alias.trim() : '';
    const candidateAlias = explicitAlias || (aliasValues[0] ?? '');

    if (!candidateAlias) {
      return NextResponse.json(
        { success: false, error: 'Alias is required for promotion' },
        { status: 400 },
      );
    }

    const updatedAlias = mergeAliasValues(
      joinAliases(aliasValues),
      actor.canonicalLabel ? [actor.canonicalLabel] : [],
      [candidateAlias],
    );
    const updatedAliasValues = splitAliases(updatedAlias);
    const updatedAliasRows: NewActorAlias[] = updatedAliasValues.map((alias) => ({
      id: uuidv4(),
      actorId: id,
      aliasValue: alias,
      aliasNormalized: alias.toLowerCase(),
      isPrimary: false,
      createdAt: now,
      updatedAt: now,
    }));

    const [updatedActor] = await db.transaction(async (tx) => {
      await tx.delete(actorAliases).where(eq(actorAliases.actorId, id));
      if (updatedAliasRows.length > 0) {
        await tx.insert(actorAliases).values(updatedAliasRows);
      }
      const updatedRows = await tx
        .update(actors)
        .set({
          canonicalLabel: candidateAlias,
          updatedAt: now,
        })
        .where(eq(actors.id, id))
        .returning();
      return updatedRows;
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedActor,
        aliases: updatedAliasValues,
      },
      audit: {
        action: 'promote-alias',
        promotedAt: now,
        previousPrimaryName: actor.canonicalLabel,
        promotedAlias: candidateAlias,
      },
    });
  } catch (error) {
    console.error('Failed to promote actor alias:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to promote actor alias' },
      { status: 500 },
    );
  }
}
