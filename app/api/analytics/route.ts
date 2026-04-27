import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { dbm, DatabaseManagerServer } from '../../../lib/db/server';
import * as schema from '../../../lib/db/schema';

/**
 * GET /api/analytics - Get database analytics and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '30'; // days

    if (!(dbm instanceof DatabaseManagerServer))
      throw new TypeError(
        'Online API called with local database manager. This endpoint must run in a server context.',
      );
    await dbm.ensureDatabaseInitialised();
    const db = dbm.getLocal();

    // Basic counts
    const articleCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.articles);
    const victimCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.victims);
    const perpetratorCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.perpetrators);
    const userCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users);

    // Articles by publication date (last N days)
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const articlesByDate = await db
      .select({
        date: schema.articles.dateOfPublication,
        count: sql<number>`count(*)`,
      })
      .from(schema.articles)
      .where(
        sql`datetime(${schema.articles.dateOfPublication}) >= datetime(${daysAgo.toISOString()})`,
      )
      .groupBy(schema.articles.dateOfPublication)
      .orderBy(schema.articles.dateOfPublication);

    // Articles by source type
    const articlesBySource = await db
      .select({
        source: schema.articles.typeOfSource,
        count: sql<number>`count(*)`,
      })
      .from(schema.articles)
      .where(sql`${schema.articles.typeOfSource} IS NOT NULL`)
      .groupBy(schema.articles.typeOfSource);

    // Victims by gender
    const victimsByGender = await db
      .select({
        gender: schema.victims.genderOfVictim,
        count: sql<number>`count(*)`,
      })
      .from(schema.victims)
      .where(sql`${schema.victims.genderOfVictim} IS NOT NULL`)
      .groupBy(schema.victims.genderOfVictim);

    // Victims by age range
    const victimsByAgeRange = await db
      .select({
        ageRange: schema.victims.ageRangeOfVictim,
        count: sql<number>`count(*)`,
      })
      .from(schema.victims)
      .where(sql`${schema.victims.ageRangeOfVictim} IS NOT NULL`)
      .groupBy(schema.victims.ageRangeOfVictim);

    // Mode of death analysis
    const modeOfDeath = await db
      .select({
        mode: schema.victims.modeOfDeathGeneral,
        count: sql<number>`count(*)`,
      })
      .from(schema.victims)
      .where(sql`${schema.victims.modeOfDeathGeneral} IS NOT NULL`)
      .groupBy(schema.victims.modeOfDeathGeneral);

    // Location analysis (by province)
    const locationAnalysis = await db
      .select({
        province: schema.victims.placeOfDeathProvince,
        count: sql<number>`count(*)`,
      })
      .from(schema.victims)
      .where(sql`${schema.victims.placeOfDeathProvince} IS NOT NULL`)
      .groupBy(schema.victims.placeOfDeathProvince)
      .orderBy(sql`count(*) DESC`);

    // Suspect status analysis
    const suspectStatus = await db
      .select({
        identified: schema.perpetrators.suspectIdentified,
        arrested: schema.perpetrators.suspectArrested,
        charged: schema.perpetrators.suspectCharged,
        convicted: schema.perpetrators.conviction,
        count: sql<number>`count(*)`,
      })
      .from(schema.perpetrators)
      .groupBy(
        schema.perpetrators.suspectIdentified,
        schema.perpetrators.suspectArrested,
        schema.perpetrators.suspectCharged,
        schema.perpetrators.conviction,
      );

    // Sync status
    const syncStats = {
      articles: await db
        .select({
          status: schema.articles.syncStatus,
          count: sql<number>`count(*)`,
        })
        .from(schema.articles)
        .groupBy(schema.articles.syncStatus),
      victims: await db
        .select({
          status: schema.victims.syncStatus,
          count: sql<number>`count(*)`,
        })
        .from(schema.victims)
        .groupBy(schema.victims.syncStatus),
      perpetrators: await db
        .select({
          status: schema.perpetrators.syncStatus,
          count: sql<number>`count(*)`,
        })
        .from(schema.perpetrators)
        .groupBy(schema.perpetrators.syncStatus),
    };

    // Data quality metrics
    const dataQuality = {
      articlesWithoutAuthor: await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.articles)
        .where(
          sql`${schema.articles.author} IS NULL OR ${schema.articles.author} = ''`,
        ),
      victimsWithoutLocation: await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.victims)
        .where(
          sql`${schema.victims.placeOfDeathProvince} IS NULL AND ${schema.victims.placeOfDeathTown} IS NULL`,
        ),
      victimsWithoutAge: await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.victims)
        .where(
          sql`${schema.victims.ageOfVictim} IS NULL AND ${schema.victims.ageRangeOfVictim} IS NULL`,
        ),
      unidentifiedSuspects: await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.perpetrators)
        .where(
          sql`${schema.perpetrators.suspectIdentified} = 'No' OR ${schema.perpetrators.suspectIdentified} IS NULL`,
        ),
    };

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalArticles: articleCount[0]?.count || 0,
          totalVictims: victimCount[0]?.count || 0,
          totalPerpetrators: perpetratorCount[0]?.count || 0,
          totalUsers: userCount[0]?.count || 0,
        },
        timeline: {
          period: parseInt(period),
          articlesByDate,
        },
        demographics: {
          victimsByGender,
          victimsByAgeRange,
        },
        crime: {
          modeOfDeath,
          locationAnalysis,
          suspectStatus,
        },
        sources: {
          articlesBySource,
        },
        sync: syncStats,
        dataQuality: {
          articlesWithoutAuthor:
            dataQuality.articlesWithoutAuthor[0]?.count || 0,
          victimsWithoutLocation:
            dataQuality.victimsWithoutLocation[0]?.count || 0,
          victimsWithoutAge: dataQuality.victimsWithoutAge[0]?.count || 0,
          unidentifiedSuspects: dataQuality.unidentifiedSuspects[0]?.count || 0,
        },
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to generate analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate analytics',
      },
      { status: 500 },
    );
  }
}
