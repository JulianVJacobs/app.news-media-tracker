import {
  isWorkbenchPluginApiEnabled,
  listPluginResource,
} from '../lib/workbench/plugin-api-client';
import { replayOfflineOperations } from '../app/api/sync/replay';
import { registerPluginRoutes } from '../plugin/routes/register-plugin-routes';
import { PluginScaffold } from '../plugin/scaffold/plugin-scaffold';
import type {
  ActorPayload,
  PluginDomainServices,
} from '../plugin/contracts/plugin-api-contract';
import {
  PluginDomainPortService,
  type PluginDatabaseSession,
} from '../plugin/src/domain/services';

type Statement = string | { sql: string; args?: unknown[] };

class InMemoryPluginSession implements PluginDatabaseSession {
  private tables = new Map<string, Map<string, Record<string, unknown>>>();

  async execute(statement: Statement): Promise<{ rows?: unknown[]; rowsAffected?: number }> {
    const sql = typeof statement === 'string' ? statement : statement.sql;
    const args = typeof statement === 'string' ? [] : statement.args ?? [];

    if (sql.startsWith('INSERT OR REPLACE INTO')) {
      return this.insertOrReplace(sql, args);
    }

    if (sql.startsWith('SELECT')) {
      return this.selectById(sql, args);
    }

    return { rows: [], rowsAffected: 0 };
  }

  private insertOrReplace(sql: string, args: unknown[]) {
    const table = sql.match(/INSERT OR REPLACE INTO\s+([a-z_]+)/i)?.[1];
    if (!table) return { rowsAffected: 0 };

    const columns =
      sql
        .match(/\(([^)]+)\)\s*VALUES/i)?.[1]
        ?.split(',')
        .map((entry) => entry.trim()) ?? [];

    const row: Record<string, unknown> = {};
    columns.forEach((column, index) => {
      row[column] = args[index] ?? null;
    });

    const id = String(row.id ?? '');
    if (!id) return { rowsAffected: 0 };

    const tableRows = this.tables.get(table) ?? new Map<string, Record<string, unknown>>();
    tableRows.set(id, row);
    this.tables.set(table, tableRows);

    return { rowsAffected: 1 };
  }

  private selectById(sql: string, args: unknown[]) {
    const table = sql.match(/FROM\s+([a-z_]+)\s+WHERE\s+id\s*=\s*\?/i)?.[1];
    const id = String(args[0] ?? '');
    if (!table || !id) return { rows: [] };

    const row = this.tables.get(table)?.get(id);
    return { rows: row ? [row] : [] };
  }
}

describe('phase 3 regression integration boundaries', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('routes workbench reads through the plugin API boundary', async () => {
    process.env = {
      ...originalEnv,
      WORKBENCH_PLUGIN_API_BASE_URL: 'https://plugin.example/api',
    };

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          items: [{ id: 'actor-1', canonicalLabel: 'Jane Doe' }],
          total: 1,
        },
      }),
    } as Response);
    global.fetch = fetchMock;

    expect(isWorkbenchPluginApiEnabled()).toBe(true);
    const result = await listPluginResource<ActorPayload>('actors', {
      search: 'Jane',
      limit: 5,
      offset: 0,
    });

    expect(result).toEqual({
      items: [{ id: 'actor-1', canonicalLabel: 'Jane Doe' }],
      total: 1,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://plugin.example/api/actors?search=Jane&limit=5&offset=0',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('enforces ACL at plugin API boundaries before calling domain services', async () => {
    const actorsList = jest.fn(async () => ({
      items: [{ id: 'actor-1', canonicalLabel: 'Jane Doe', actorKind: 'person' }],
      total: 1,
    }));
    const actorsCreate = jest.fn(async (input: Omit<ActorPayload, 'id'>) => ({
      id: 'actor-2',
      ...input,
    }));

    const services = {
      actors: { list: actorsList, create: actorsCreate },
      events: { list: jest.fn(), create: jest.fn() },
      claims: { list: jest.fn(), create: jest.fn() },
      claimArchivalLinks: { listByClaimId: jest.fn(), create: jest.fn() },
      victims: { list: jest.fn(), create: jest.fn() },
      perpetrators: { list: jest.fn(), create: jest.fn() },
      participants: { list: jest.fn(), create: jest.fn() },
    } as unknown as PluginDomainServices;

    const scaffold = new PluginScaffold();
    registerPluginRoutes(scaffold, services);

    const unauthorized = await scaffold.dispatch('GET', '/actors', {
      auth: { userId: 'user-1' },
    });
    expect(unauthorized.status).toBe(403);
    expect(actorsList).not.toHaveBeenCalled();

    const authorized = await scaffold.dispatch('GET', '/actors', {
      auth: { userId: 'user-1', permissions: ['actors:read'] },
      query: { limit: '10' },
    });
    expect(authorized.status).toBe(200);
    expect(actorsList).toHaveBeenCalledTimes(1);
  });

  it('replays offline writes idempotently through the sync bridge', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    });

    const result = await replayOfflineOperations(
      [
        {
          queueId: 1,
          requestId: 'replay-1',
          method: 'POST',
          endpoint: '/api/events',
          body: { id: 'event-1' },
        },
        {
          queueId: 2,
          requestId: 'replay-1',
          method: 'POST',
          endpoint: '/api/events',
          body: { id: 'event-1' },
        },
      ],
      {
        requestOrigin: 'http://localhost:3000',
        remoteBaseUrl: 'https://plugin.example',
        replayCache: new Map(),
        fetchImpl: fetchMock as unknown as typeof fetch,
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.results.map((entry) => entry.status).sort()).toEqual([
      'duplicate',
      'replayed',
    ]);
    expect(result.ackedQueueIds.sort((a, b) => a - b)).toEqual([1, 2]);
  });

  it('persists and restores domain records through the plugin persistence port', async () => {
    const service = new PluginDomainPortService(new InMemoryPluginSession());

    await service.saveActor({
      id: 'actor-1',
      canonicalLabel: 'Jane Doe',
      actorKind: 'person',
      status: 'active',
      schemaProfileId: 'homicide-profile',
    });

    await expect(service.getActor('actor-1')).resolves.toEqual({
      id: 'actor-1',
      canonicalLabel: 'Jane Doe',
      actorKind: 'person',
      status: 'active',
      schemaProfileId: 'homicide-profile',
    });
  });
});
