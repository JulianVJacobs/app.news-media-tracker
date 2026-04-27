import { dbm, DatabaseManagerClient } from '../../../lib/db/client';
import type { Victim } from '../../../lib/db/schema';
import { prepareVictimPayload } from '../../../lib/utils/transformers';
import { getBaseUrl } from '../../../lib/platform';
import { coerceVictim } from './utils';

export async function get(req: Request) {
  console.log('api/victims:GET');
  const url = new URL(req.url, getBaseUrl());
  const id = url.searchParams.get('id');
  const limit = Number.parseInt(url.searchParams.get('limit') || '50', 10);
  const offset = Number.parseInt(url.searchParams.get('offset') || '0', 10);
  const search = url.searchParams.get('search') || '';
  const articleId = url.searchParams.get('articleId') || '';

  try {
    if (!(dbm instanceof DatabaseManagerClient))
      throw new TypeError(
        'Offline API called with non-local database manager. This endpoint must run in a browser context.',
      );
    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();
    if (id) {
      const victim = await db.victims.get(id);
      return { success: true, data: victim };
    }
    let all: Victim[] = await db.victims.toArray();
    if (articleId) {
      all = all.filter((v) => v.articleId === articleId);
    } else if (search) {
      const s = search.toLowerCase();
      all = all.filter((v) => {
        return (
          (v.victimName && v.victimName.toLowerCase().includes(s)) ||
          (v.victimAlias && v.victimAlias.toLowerCase().includes(s)) ||
          (v.placeOfDeathProvince &&
            v.placeOfDeathProvince.toLowerCase().includes(s)) ||
          (v.placeOfDeathTown &&
            v.placeOfDeathTown.toLowerCase().includes(s)) ||
          (v.policeStation && v.policeStation.toLowerCase().includes(s))
        );
      });
    }
    const total = all.length;
    const data = all.slice(offset, offset + limit);
    return {
      success: true,
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
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
  console.log('api/victims:POST');
  const payload = await req.json();
  const { data: victimData, validation } = prepareVictimPayload(payload);

  if (!validation.isValid) {
    return {
      success: false,
      error: 'Validation failed',
      details: validation.errors,
      warnings: validation.warnings,
    };
  }

  const coerced = coerceVictim(victimData);
  if (!coerced.articleId) {
    return {
      success: false,
      error: 'Article ID is required',
      warnings: validation.warnings,
    };
  }
  const { v4: uuidv4 } = await import('uuid');
  const id = uuidv4();

  try {
    if (!(dbm instanceof DatabaseManagerClient))
      throw new TypeError(
        'Offline API called with non-local database manager. This endpoint must run in a browser context.',
      );
    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();
    const now = new Date().toISOString();
    const newVictim: Victim = {
      id,
      ...coerced,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
      failureCount: 0,
      lastSyncAt: null,
    };
    await db.victims.add(newVictim);
    await dbm.addToSyncQueue('POST', '/api/victims', newVictim);
    return {
      success: true,
      data: newVictim,
      message: 'Victim created successfully',
      warnings: validation.warnings,
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
  console.log('api/victims:PUT');
  const payload = await req.json();
  const { id } = payload ?? {};
  if (typeof id !== 'string' || !id) {
    return { success: false, error: 'Victim ID is required' };
  }
  const { data: victimData, validation } = prepareVictimPayload(payload);
  if (!validation.isValid) {
    return {
      success: false,
      error: 'Validation failed',
      details: validation.errors,
      warnings: validation.warnings,
    };
  }

  try {
    if (!(dbm instanceof DatabaseManagerClient))
      throw new TypeError(
        'Offline API called with non-local database manager. This endpoint must run in a browser context.',
      );
    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();
    const existing = await db.victims.get(id);
    if (!existing) {
      return { success: false, error: 'Victim not found' };
    }
    const coercedUpdate = coerceVictim(victimData, existing);
    if (!coercedUpdate.articleId) {
      return { success: false, error: 'Article ID is required' };
    }
    const now = new Date().toISOString();
    const updatedVictim: Victim = {
      ...existing,
      ...coercedUpdate,
      updatedAt: now,
      syncStatus: 'pending',
      failureCount: existing?.failureCount ?? 0,
      lastSyncAt: existing?.lastSyncAt ?? null,
    };
    await db.victims.put(updatedVictim);
    await dbm.addToSyncQueue('PUT', '/api/victims', updatedVictim);
    return {
      success: true,
      data: updatedVictim,
      message: 'Victim updated successfully',
      warnings: validation.warnings,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

// DELETE /api/victims (offline)
export async function del(req: Request) {
  console.log('api/victims:DEL');
  const url = new URL(req.url, getBaseUrl());
  const id = url.searchParams.get('id');
  if (!id) {
    return { success: false, error: 'Victim ID is required' };
  }

  try {
    if (!(dbm instanceof DatabaseManagerClient))
      throw new TypeError(
        'Offline API called with non-local database manager. This endpoint must run in a browser context.',
      );
    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();
    const existing = await db.victims.get(id);
    if (!existing) {
      return { success: false, error: 'Victim not found' };
    }
    await db.victims.delete(id);
    await dbm.addToSyncQueue('DELETE', `/api/victims?id=${id}`);
    return {
      success: true,
      message: 'Victim deleted successfully',
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
