'use client';

import { dbm, DatabaseManagerClient } from '../../../lib/db/client';
import type { Article } from '../../../lib/db/schema';
import {
  detectDuplicates,
  generateArticleId,
} from '../../../lib/components/utils';
import { prepareArticlePayload } from '../../../lib/utils/transformers';
import { getBaseUrl } from '../../../lib/platform';
import { coerceArticle, mapDuplicateMatchDtos } from './utils';

export async function get(req: Request) {
  console.log('api/articles:GET');
  const url = new URL(req.url, getBaseUrl());
  const id = url.searchParams.get('id');
  const limit = Number.parseInt(url.searchParams.get('limit') || '50', 10);
  const offset = Number.parseInt(url.searchParams.get('offset') || '0', 10);
  const search = url.searchParams.get('search') || '';

  try {
    if (!(dbm instanceof DatabaseManagerClient))
      throw new TypeError(
        'Offline API called with non-local database manager. This endpoint must run in a browser context.',
      );
    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();
    if (id) {
      const article = await db.articles.get(id);
      return { success: true, data: article };
    }
    let all: Article[] = await db.articles.toArray();
    if (search) {
      const s = search.toLowerCase();
      all = all.filter((a) => {
        return (
          (a.newsReportHeadline &&
            a.newsReportHeadline.toLowerCase().includes(s)) ||
          (a.author && a.author.toLowerCase().includes(s)) ||
          (a.notes && a.notes.toLowerCase().includes(s))
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
  console.log('api/articles:POST');
  const body = await req.json();
  const { data: articlePayload, validation } = prepareArticlePayload(body);
  if (!validation.isValid) {
    return {
      success: false,
      error: 'Validation failed',
      details: validation.errors,
    };
  }

  const coerced = coerceArticle(articlePayload);
  const id = generateArticleId(
    coerced.newsReportUrl ?? '',
    coerced.author ?? '',
    coerced.newsReportHeadline ?? '',
  );

  try {
    if (!(dbm instanceof DatabaseManagerClient))
      throw new TypeError(
        'Offline API called with non-local database manager. This endpoint must run in a browser context.',
      );
    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();
    const existingArticles: Article[] = await db.articles.toArray();
    const duplicates = detectDuplicates(coerced, existingArticles);
    const duplicateDtos = mapDuplicateMatchDtos(duplicates);
    if (duplicates.length > 0 && duplicates[0].confidence === 'high') {
      return {
        success: false,
        error: 'Potential duplicate article detected',
        duplicates: duplicateDtos.slice(0, 3),
        id: duplicates[0].id,
      };
    }

    const now = new Date().toISOString();
    const articleData: Article = {
      id,
      ...coerced,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
      failureCount: 0,
      lastSyncAt: null,
    };

    await db.articles.add(articleData);
    await dbm.addToSyncQueue('POST', '/api/articles', articleData);
    return {
      success: true,
      data: articleData,
      warnings: validation.warnings,
      duplicates: duplicateDtos.length > 0 ? duplicateDtos.slice(0, 3) : [],
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
  console.log('api/articles:PUT');
  const body = await req.json();
  const articleId = typeof body.articleId === 'string' ? body.articleId : '';

  if (!articleId) {
    return { success: false, error: 'Article ID is required' };
  }

  const { data: articlePayload, validation } = prepareArticlePayload(body);
  if (!validation.isValid) {
    return {
      success: false,
      error: 'Validation failed',
      details: validation.errors,
    };
  }

  try {
    if (!(dbm instanceof DatabaseManagerClient))
      throw new TypeError(
        'Offline API called with non-local database manager. This endpoint must run in a browser context.',
      );

    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();
    const existing = await db.articles.get(articleId);

    if (!existing) {
      return { success: false, error: 'Article not found' };
    }

    const coercedUpdate = coerceArticle(articlePayload, existing);
    const now = new Date().toISOString();
    const updatedArticle: Article = {
      ...existing,
      ...coercedUpdate,
      updatedAt: now,
      syncStatus: 'pending',
      failureCount: 0,
      lastSyncAt: null,
    };

    await db.articles.put(updatedArticle);
    await dbm.addToSyncQueue('PUT', '/api/articles', updatedArticle);

    return {
      success: true,
      data: updatedArticle,
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
  console.log('api/articles:DEL');
  const url = new URL(req.url, getBaseUrl());
  const articleId = url.searchParams.get('articleId');
  if (!articleId) {
    return { success: false, error: 'Article ID is required' };
  }

  try {
    if (!(dbm instanceof DatabaseManagerClient))
      throw new TypeError(
        'Offline API called with non-local database manager. This endpoint must run in a browser context.',
      );
    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();
    const existing = await db.articles.get(articleId);
    if (!existing) {
      return { success: false, error: 'Article not found' };
    }
    await db.articles.delete(articleId);
    await dbm.addToSyncQueue('DELETE', `/api/articles?articleId=${articleId}`);
    // Note: cascade delete for victims/perpetrators would require additional logic
    return {
      success: true,
      message: 'Article deleted successfully',
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
