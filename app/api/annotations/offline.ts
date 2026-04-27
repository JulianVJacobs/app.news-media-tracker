import { dbm, DatabaseManagerClient } from '../../../lib/db/client';
import { getBaseUrl } from '../../../lib/platform';
import { normalizeReportAnnotationInput } from '../../../lib/utils/report-annotations';
import { v4 as uuidv4 } from 'uuid';

export async function get(req: Request) {
  const url = new URL(req.url, getBaseUrl());
  const id = url.searchParams.get('id');
  const articleId = url.searchParams.get('articleId');

  try {
    if (!(dbm instanceof DatabaseManagerClient)) {
      throw new TypeError(
        'Offline API called with non-local database manager. This endpoint must run in a browser context.',
      );
    }

    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();

    if (id) {
      const annotation = await db.reportAnnotations.get(id);
      return { success: true, data: annotation ?? null };
    }

    const records = articleId
      ? await (async () => {
          const [sourceMatches, targetMatches] = await Promise.all([
            db.reportAnnotations
              .where('sourceArticleId')
              .equals(articleId)
              .toArray(),
            db.reportAnnotations
              .where('targetArticleId')
              .equals(articleId)
              .toArray(),
          ]);
          const deduplicated = new Map(
            [...sourceMatches, ...targetMatches].map((record) => [
              record.id,
              record,
            ]),
          );
          return Array.from(deduplicated.values());
        })()
      : await db.reportAnnotations.toArray();

    return { success: true, data: records };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function post(req: Request) {
  const body = await req.json();

  try {
    const normalized = normalizeReportAnnotationInput(body);
    const id = typeof body.id === 'string' && body.id ? body.id : uuidv4();

    if (!(dbm instanceof DatabaseManagerClient)) {
      throw new TypeError(
        'Offline API called with non-local database manager. This endpoint must run in a browser context.',
      );
    }

    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();

    const now = new Date().toISOString();
    const newAnnotation = {
      id,
      ...normalized,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending' as const,
      failureCount: 0,
    };

    await db.reportAnnotations.add(newAnnotation);
    await dbm.addToSyncQueue('POST', '/api/annotations', newAnnotation);

    return {
      success: true,
      data: newAnnotation,
      message: 'Annotation created successfully',
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
