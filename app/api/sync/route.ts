import { NextRequest, NextResponse } from 'next/server';
import { dbm, DatabaseManagerServer } from '../../../lib/db/server';
import {
  normalizeReplayOperations,
  type ReplayResult,
  replayOfflineOperations,
} from './replay';

const replayCache = new Map<string, ReplayResult>();
// Best-effort in-memory de-duplication for short retry windows.

/**
 * GET /api/sync - Get sync configuration and status
 */
export async function GET() {
  try {
    if (!(dbm instanceof DatabaseManagerServer))
      throw new TypeError(
        'Online API called with local database manager. This endpoint must run in a server context.',
      );
    await dbm.ensureDatabaseInitialised();
    const config = dbm.getConfig();

    return NextResponse.json({
      success: true,
      data: {
        enabled: config.sync.enabled,
        remoteUrl: config.remote?.url || null,
        conflictResolution: config.sync.conflictResolution,
        syncInterval: config.remote?.syncInterval || 15,
        lastSync: null, // Would be populated from sync metadata
      },
    });
  } catch (error) {
    console.error('Failed to get sync configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve sync configuration',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/sync - Configure remote sync
 */
export async function POST(request: NextRequest) {
  try {
    const { remoteUrl, authToken, syncInterval = 15 } = await request.json();

    if (!remoteUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Remote URL is required',
        },
        { status: 400 },
      );
    }

    // Only call configureRemote if running on server (type assertion)
    if (dbm instanceof DatabaseManagerServer) {
      await dbm.configureRemote(remoteUrl, authToken);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Remote sync configuration is only available on the server.',
        },
        { status: 400 },
      );
    }

    // Update sync interval
    dbm.updateConfig({
      remote: {
        url: remoteUrl,
        authToken,
        syncInterval,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Sync configuration updated successfully',
    });
  } catch (error) {
    console.error('Failed to configure sync:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to configure sync',
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/sync - Disable sync
 */
export async function DELETE() {
  try {
    dbm.updateConfig({
      sync: { enabled: false, conflictResolution: 'local' },
      remote: undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Sync disabled successfully',
    });
  } catch (error) {
    console.error('Failed to disable sync:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to disable sync',
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/sync - Process sync queue
 */
export async function PATCH(request: NextRequest) {
  try {
    if (dbm instanceof DatabaseManagerServer) {
      let replayPayload: unknown = null;

      try {
        replayPayload = await request.json();
      } catch {
        replayPayload = null;
      }

      const replayOperations = normalizeReplayOperations(
        replayPayload &&
          typeof replayPayload === 'object' &&
          replayPayload !== null &&
          'operations' in replayPayload
          ? (replayPayload as { operations?: unknown }).operations
          : [],
      );

      if (replayOperations.length > 0) {
        const config = dbm.getConfig();
        const { ackedQueueIds, results } = await replayOfflineOperations(
          replayOperations,
          {
            requestOrigin: request.nextUrl.origin,
            remoteBaseUrl: config.remote?.url,
            remoteAuthToken: config.remote?.authToken,
            forwardedHeaders: {
              authorization: request.headers.get('authorization') ?? undefined,
              cookie: request.headers.get('cookie') ?? undefined,
            },
            replayCache,
          },
        );
        const replayed = results.filter((result) => result.status === 'replayed');
        const duplicates = results.filter(
          (result) => result.status === 'duplicate',
        );
        const failed = results.filter((result) => result.status === 'failed');

        return NextResponse.json({
          success: failed.length === 0,
          message: 'Replay batch processed',
          counts: {
            replayed: replayed.length,
            duplicate: duplicates.length,
            failed: failed.length,
          },
          ackedQueueIds,
          results,
        });
      }

      await dbm.processSyncQueue();
      return NextResponse.json({
        success: true,
        message: 'Sync queue processed successfully',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Sync queue processing is only available on the server.',
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('Failed to process sync queue:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process sync queue',
      },
      { status: 500 },
    );
  }
}
