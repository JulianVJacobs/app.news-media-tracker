import { NextResponse } from 'next/server';
import { and, eq, like, sql } from 'drizzle-orm';
import { dbm, DatabaseManagerServer } from '../../../../lib/db/server';
import { articles, schemaVocabTerms } from '../../../../lib/db/schema';
import {
  buildOutletSuggestions,
  normalizeOutletValue,
  normalizeTermKey,
  OUTLET_VOCAB_KEY,
} from './utils';

const ensureServerDatabase = async () => {
  if (!(dbm instanceof DatabaseManagerServer)) {
    throw new TypeError(
      'Online API called with local database manager. This endpoint must run in a server context.',
    );
  }
  await dbm.ensureDatabaseInitialised();
  return dbm.getLocal();
};

export async function GET(request: Request) {
  try {
    const db = await ensureServerDatabase();
    const url = new URL(request.url);
    const query = normalizeOutletValue(url.searchParams.get('query') ?? '');
    const parsedLimit = Number.parseInt(url.searchParams.get('limit') ?? '10', 10);
    const limit = Number.isNaN(parsedLimit) ? 10 : Math.max(1, Math.min(parsedLimit, 50));
    const wildcard = `%${query}%`;

    const [articleRows, vocabRows] = await Promise.all([
      db
        .select({ outlet: articles.newsReportPlatform })
        .from(articles)
        .where(
          query
            ? like(sql`COALESCE(${articles.newsReportPlatform}, '')`, wildcard)
            : sql`${articles.newsReportPlatform} IS NOT NULL`,
        )
        .limit(200),
      db
        .select({ outlet: schemaVocabTerms.label })
        .from(schemaVocabTerms)
        .where(
          and(
            eq(schemaVocabTerms.vocabKey, OUTLET_VOCAB_KEY),
            query
              ? like(sql`COALESCE(${schemaVocabTerms.label}, '')`, wildcard)
              : sql`${schemaVocabTerms.label} IS NOT NULL`,
          ),
        )
        .limit(200),
    ]);

    const options = buildOutletSuggestions(
      query,
      [
        ...articleRows.map((row) => row.outlet ?? ''),
        ...vocabRows.map((row) => row.outlet ?? ''),
      ],
      limit,
    );

    return NextResponse.json({
      success: true,
      data: options,
    });
  } catch (error) {
    console.error('Failed to fetch news outlet options:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch news outlet options' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = await ensureServerDatabase();
    const payload = (await request.json()) as Record<string, unknown>;
    const outletRaw = typeof payload?.outlet === 'string' ? payload.outlet : '';
    const outlet = normalizeOutletValue(outletRaw);

    if (!outlet) {
      return NextResponse.json(
        { success: false, error: 'outlet is required' },
        { status: 400 },
      );
    }

    const existing = await db
      .select({
        id: schemaVocabTerms.id,
        label: schemaVocabTerms.label,
      })
      .from(schemaVocabTerms)
      .where(
        and(
          eq(schemaVocabTerms.vocabKey, OUTLET_VOCAB_KEY),
          sql`lower(${schemaVocabTerms.label}) = lower(${outlet})`,
        ),
      )
      .limit(1);

    if (existing[0]) {
      return NextResponse.json({
        success: true,
        data: existing[0].label,
        created: false,
      });
    }

    const now = new Date().toISOString();
    await db.insert(schemaVocabTerms).values({
      vocabKey: OUTLET_VOCAB_KEY,
      termKey: `${normalizeTermKey(outlet)}-${Date.now().toString(36)}`,
      label: outlet,
      description: null,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        success: true,
        data: outlet,
        created: true,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to add news outlet option:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add news outlet option' },
      { status: 500 },
    );
  }
}
