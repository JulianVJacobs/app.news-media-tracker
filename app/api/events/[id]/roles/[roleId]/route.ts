import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { dbm, DatabaseManagerServer } from '../../../../../../lib/db/server';
import { eventActorRoles } from '../../../../../../lib/db/schema';

const ensureServerDatabase = async () => {
  if (!(dbm instanceof DatabaseManagerServer)) {
    throw new TypeError(
      'Online API called with local database manager. This endpoint must run in a server context.',
    );
  }
  await dbm.ensureDatabaseInitialised();
  return dbm.getLocal();
};

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; roleId: string } },
) {
  try {
    const db = await ensureServerDatabase();
    const { id: eventId, roleId } = params;

    const existing = await db
      .select()
      .from(eventActorRoles)
      .where(and(eq(eventActorRoles.id, roleId), eq(eventActorRoles.eventId, eventId)))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json(
        { success: false, error: 'Role assignment not found for this event' },
        { status: 404 },
      );
    }

    await db.delete(eventActorRoles).where(eq(eventActorRoles.id, roleId));

    return NextResponse.json({
      success: true,
      message: 'Event actor role deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete event actor role:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete event actor role' },
      { status: 500 },
    );
  }
}
