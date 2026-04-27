// import { dbm } from '../../../lib/db/manager';
import { dbm, DatabaseManagerClient } from '../../../lib/db/client';
import type { Perpetrator } from '../../../lib/db/schema';
import { preparePerpetratorPayload } from '../../../lib/utils/transformers';
import { getBaseUrl } from '../../../lib/platform';
import { coercePerpetrator } from './utils';

export async function get(req: Request) {
  console.log('api/perpetrators:GET');
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
      const perpetrator = await db.perpetrators.get(id);
      return { success: true, data: perpetrator };
    }
    let all: Perpetrator[] = await db.perpetrators.toArray();
    if (articleId) {
      all = all.filter((p) => p.articleId === articleId);
    } else if (search) {
      const s = search.toLowerCase();
      all = all.filter((p) => {
        return (
          (p.perpetratorName && p.perpetratorName.toLowerCase().includes(s)) ||
          (p.perpetratorAlias &&
            p.perpetratorAlias.toLowerCase().includes(s)) ||
          (p.perpetratorRelationshipToVictim &&
            p.perpetratorRelationshipToVictim.toLowerCase().includes(s)) ||
          (p.sentence && p.sentence.toLowerCase().includes(s))
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
  console.log('api/perpetrators:POST');
  const payload = await req.json();
  const { data: perpetratorData, validation } =
    preparePerpetratorPayload(payload);
  if (!validation.isValid) {
    return {
      success: false,
      error: 'Validation failed',
      details: validation.errors,
      warnings: validation.warnings,
    };
  }
  const coerced = coercePerpetrator(perpetratorData);
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
    const newPerpetrator: Perpetrator = {
      id,
      ...coerced,
      syncStatus: 'pending',
      failureCount: 0,
      createdAt: now,
      updatedAt: now,
      lastSyncAt: null,
    };
    await db.perpetrators.add(newPerpetrator);
    await dbm.addToSyncQueue('POST', '/api/perpetrators', newPerpetrator);
    return {
      success: true,
      data: newPerpetrator,
      message: 'Perpetrator created successfully',
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
  console.log('api/perpetrators:PUT');
  const payload = await req.json();
  const { id } = payload ?? {};
  if (typeof id !== 'string' || !id) {
    return { success: false, error: 'Perpetrator ID is required' };
  }
  const { data: perpetratorData, validation } =
    preparePerpetratorPayload(payload);
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
    const existing = await db.perpetrators.get(id);
    if (!existing) {
      return { success: false, error: 'Perpetrator not found' };
    }
    const coerced = coercePerpetrator(perpetratorData, existing);
    if (!coerced.articleId) {
      return { success: false, error: 'Article ID is required' };
    }
    const now = new Date().toISOString();
    const updatedPerpetrator: Perpetrator = {
      ...existing,
      ...coerced,
      updatedAt: now,
      syncStatus: 'pending',
      failureCount: existing?.failureCount ?? 0,
      lastSyncAt: existing?.lastSyncAt ?? null,
    };
    await db.perpetrators.update(id, updatedPerpetrator);
    await dbm.addToSyncQueue('PUT', '/api/perpetrators', updatedPerpetrator);
    return {
      success: true,
      data: updatedPerpetrator,
      message: 'Perpetrator updated successfully',
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

export async function del(req: Request) {
  console.log('api/perpetrators:DEL');
  const url = new URL(req.url, getBaseUrl());
  const id = url.searchParams.get('id');

  try {
    if (!(dbm instanceof DatabaseManagerClient))
      throw new TypeError(
        'Offline API called with non-local database manager. This endpoint must run in a browser context.',
      );
    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();
    if (!id) {
      return { success: false, error: 'Perpetrator ID is required' };
    }
    const existing = await db.perpetrators.get(id);
    if (!existing) {
      return { success: false, error: 'Perpetrator not found' };
    }
    await db.perpetrators.delete(id);
    await dbm.addToSyncQueue('DELETE', `/api/perpetrators?id=${id}`);
    return {
      success: true,
      message: 'Perpetrator deleted successfully',
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
