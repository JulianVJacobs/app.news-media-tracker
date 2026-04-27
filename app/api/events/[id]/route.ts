import { eq, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { dbm, DatabaseManagerServer } from '../../../../lib/db/server';
import { events, perpetrators, victims } from '../../../../lib/db/schema';
import { buildIntegratedEventPayload } from '../../../../lib/events/integration';

const parseParticipantIds = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((id): id is string => typeof id === 'string' && id.length > 0);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter(
            (id): id is string => typeof id === 'string' && id.length > 0,
          )
        : [];
    } catch {
      return [];
    }
  }

  return [];
};

export async function GET(
  _request: Request,
  context: { params: { id: string } },
) {
  try {
    if (!(dbm instanceof DatabaseManagerServer)) {
      throw new TypeError(
        'Online API called with local database manager. This endpoint must run in a server context.',
      );
    }
    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();

    const eventId = context.params.id;
    const eventRows = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    const event = eventRows[0];

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 },
      );
    }

    const participantIds = parseParticipantIds(event.participantIds);
    const victimRows =
      participantIds.length > 0
        ? await db.select().from(victims).where(inArray(victims.id, participantIds))
        : [];
    const perpetratorRows =
      participantIds.length > 0
        ? await db
            .select()
            .from(perpetrators)
            .where(inArray(perpetrators.id, participantIds))
        : [];

    const payload = buildIntegratedEventPayload(
      event,
      victimRows,
      perpetratorRows,
    );

    return NextResponse.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    console.error('Failed to fetch integrated event view:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve integrated event',
      },
      { status: 500 },
    );
  }
}
