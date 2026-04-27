// import { dbm } from '../../../lib/db/manager';
import { dbm, DatabaseManagerClient } from '../../../lib/db/client';
import { type Event } from '../../../lib/db/schema';
import { getBaseUrl } from '../../../lib/platform';

export async function get(req: Request) {
  const url = new URL(req.url, getBaseUrl());
  const id = url.searchParams.get('id');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const search = url.searchParams.get('search') || '';

  try {
    if (!(dbm instanceof DatabaseManagerClient))
      throw new TypeError(
        'Offline API called with non-local database manager. This endpoint must run in a browser context.',
      );
    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();

    if (id) {
      const event = await db.events.get(id);
      return { success: true, data: event };
    }
    let all = await db.events.toArray();
    if (search) {
      const s = search.toLowerCase();
      all = all.filter((event: Event) => {
        const eventTypes = Array.isArray(event.eventTypes)
          ? event.eventTypes
          : typeof event.eventTypes === 'string'
            ? JSON.parse(event.eventTypes || '[]')
            : [];
        const details =
          typeof event.details === 'string'
            ? JSON.parse(event.details || '{}')
            : event.details;
        return (
          eventTypes.some((type: string) => type.toLowerCase().includes(s)) ||
          Object.values(details).some(
            (val) => typeof val === 'string' && val.toLowerCase().includes(s),
          )
        );
      });
    }
    const startIndex = (page - 1) * limit;
    const paginatedEvents = all.slice(startIndex, startIndex + limit);
    const total = all.length;
    return {
      success: true,
      data: {
        events: Array.isArray(paginatedEvents) ? paginatedEvents : [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function post(req: Request) {
  console.log('api/events:POST');
  const body = await req.json();
  if (
    !body.eventTypes ||
    !body.articleIds ||
    !body.participantIds ||
    !body.details
  ) {
    return {
      success: false,
      error: 'Missing required fields',
      message:
        'eventTypes, articleIds, participantIds, and details are required',
    };
  }
  const eventTypes = Array.isArray(body.eventTypes)
    ? body.eventTypes
    : JSON.parse(body.eventTypes);
  const details =
    typeof body.details === 'string' ? JSON.parse(body.details) : body.details;
  const { v4: uuidv4 } = await import('uuid');
  const id = body.eventId || uuidv4();
  try {
    if (!(dbm instanceof DatabaseManagerClient))
      throw new TypeError(
        'Offline API called with non-local database manager. This endpoint must run in a browser context.',
      );
    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();

    const newEvent = {
      id,
      eventTypes,
      articleIds: body.articleIds,
      participantIds: body.participantIds,
      details,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
      failureCount: 0,
    };
    await db.events.add(newEvent);
    await dbm.addToSyncQueue('POST', '/api/events', newEvent);

    return {
      success: true,
      data: newEvent,
      message: 'Event created successfully',
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function put(req: Request) {
  console.log('api/events:PUT');
  const body = await req.json();
  if (!body.id) {
    return { success: false, error: 'Event ID is required' };
  }
  try {
    if (!(dbm instanceof DatabaseManagerClient))
      throw new TypeError(
        'Offline API called with non-local database manager. This endpoint must run in a browser context.',
      );
    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();

    const existing = await db.events.get(body.id);
    if (!existing) {
      return { success: false, error: 'Event not found' };
    }
    const updatedEvent = {
      ...existing,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    await db.events.update(body.id, updatedEvent);
    if (dbm instanceof DatabaseManagerClient)
      await dbm.addToSyncQueue('PUT', '/api/events', updatedEvent);

    return {
      success: true,
      data: updatedEvent,
      message: 'Event updated successfully',
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function del(req: Request) {
  console.log('api/events:DEL');
  const url = new URL(req.url, getBaseUrl());
  const id = url.searchParams.get('id');
  if (!id) {
    return { success: false, error: 'Event ID is required' };
  }
  try {
    if (!(dbm instanceof DatabaseManagerClient))
      throw new TypeError(
        'Offline API called with non-local database manager. This endpoint must run in a browser context.',
      );
    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();

    const existing = await db.events.get(id);
    if (!existing) {
      return { success: false, error: 'Event not found' };
    }
    await db.events.delete(id);
    if (dbm instanceof DatabaseManagerClient)
      await dbm.addToSyncQueue('DELETE', `/api/events?id=${id}`);

    return {
      success: true,
      message: 'Event deleted successfully',
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
