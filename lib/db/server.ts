import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import {
  articles,
  victims,
  perpetrators,
  users,
  events,
  annotationEvents,
  reportAnnotations,
  participants,
  schemaProfiles,
  schemaFields,
  actors,
  actorAliases,
  actorIdentifiers,
  schemaConstraints,
  schemaVocabTerms,
  eventActorRoles,
  claims,
  claimEvidence,
  appConfig,
  syncQueue,
  migrations,
} from './schema';
import {
  DEFAULT_EVENT_ACTOR_ROLE_TERMS,
  EVENT_ACTOR_ROLE_VOCAB_KEY,
} from './role-vocabulary';
import {
  HOMICIDE_DEFAULT_DOMAIN_SEED,
  type DomainSeedDefinition,
  type DomainSeedSqlClient,
  applyDomainSeed,
} from './domain-seed';

type ElectronAppLike = Pick<import('electron').App, 'getPath' | 'isPackaged'>;

const electronApp: ElectronAppLike | null = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return ((require('electron') as typeof import('electron'))?.app ??
      null) as ElectronAppLike | null;
  } catch {
    return null;
  }
})();

type ElectronProcess = NodeJS.Process & { resourcesPath?: string };

export interface DatabaseConfig {
  local: {
    path: string;
    backupPath?: string;
  };
  remote?: {
    url: string;
    authToken?: string;
    syncInterval?: number; // minutes
  };
  sync: {
    enabled: boolean;
    conflictResolution: 'local' | 'remote' | 'manual';
  };
}

class DatabaseManagerServer {
  private getDomainSeedClient(): DomainSeedSqlClient | null {
    if (!this.localClient) {
      return null;
    }

    return {
      execute: (statement) => {
        if (typeof statement === 'string') {
          return this.localClient!.execute(statement);
        }
        return this.localClient!.execute({
          sql: statement.sql,
          args: (statement.args ?? []) as unknown as import('@libsql/client').InArgs,
        });
      },
    };
  }

  private domainSeedRegistry = new Map<string, DomainSeedDefinition>([
    [HOMICIDE_DEFAULT_DOMAIN_SEED.domainKey, HOMICIDE_DEFAULT_DOMAIN_SEED],
  ]);

  async ensureDatabaseInitialised(): Promise<void> {
    if (!this.localDb) {
      await this.initialiseLocal();
    }
  }
  private localClient: ReturnType<typeof createClient> | null = null;
  private localDb: ReturnType<typeof drizzle> | null = null;
  private remoteClient: ReturnType<typeof createClient> | null = null;
  private remoteDrizzle: ReturnType<typeof drizzle> | null = null;
  private config: DatabaseConfig;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Determine correct data path for packaged vs dev mode
    let userDataPath = electronApp?.getPath('userData') ?? './data';
    const resourcesPath =
      typeof process !== 'undefined'
        ? (process as ElectronProcess).resourcesPath
        : undefined;
    if (electronApp?.isPackaged && resourcesPath) {
      // In packaged mode, use resourcesPath for DB location if needed
      userDataPath = resourcesPath;
    }
    if (!fs.existsSync(userDataPath)) {
      try {
        fs.mkdirSync(userDataPath, { recursive: true });
      } catch (err) {
        console.error('Failed to create userDataPath:', userDataPath, err);
      }
    }
    // Robust path normalization for cross-platform compatibility
    const dbPath = path
      .normalize(`${userDataPath}/news-report-tracker.db`)
      .replace(/\\/g, '/');
    const backupPath = path
      .normalize(`${userDataPath}/news-report-tracker-backup.db`)
      .replace(/\\/g, '/');
    this.config = {
      local: {
        path: dbPath,
        backupPath: backupPath,
      },
      sync: {
        enabled: false,
        conflictResolution: 'local',
      },
    };
  }

  async initialiseLocal(): Promise<void> {
    // Fallback strategies for DB client creation
    let clientCreated = false;
    let lastError: Error | null = null;
    const strategies = [
      () => createClient({ url: `file:${this.config.local.path}` }),
      () => createClient({ url: this.config.local.path }),
      () => createClient({ url: `file:///${this.config.local.path}` }),
      () => createClient({ url: path.resolve(this.config.local.path) }),
    ];
    for (let i = 0; i < strategies.length; i++) {
      try {
        this.localClient = strategies[i]();
        clientCreated = true;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }
    }
    if (!clientCreated || !this.localClient) {
      throw new Error(
        `All libsql client creation strategies failed. Last error: ${lastError?.message}`,
      );
    }
    this.localDb = drizzle(this.localClient, {
      schema: {
        articles,
        victims,
        perpetrators,
        users,
        events,
        annotationEvents,
        reportAnnotations,
        participants,
        schemaProfiles,
        schemaFields,
        actors,
        actorAliases,
        actorIdentifiers,
        schemaConstraints,
        schemaVocabTerms,
        eventActorRoles,
        claims,
        claimEvidence,
        appConfig,
        syncQueue,
      },
    });
    for (const sql of migrations) {
      try {
        await this.localClient.execute(sql);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isDuplicateColumnMigration =
          sql.startsWith('ALTER TABLE') &&
          message.toLowerCase().includes('duplicate column name');
        if (!isDuplicateColumnMigration) {
          throw error;
        }
      }
    }
    await this.seedRegisteredDomainSeeds();
    await this.seedDefaultRoleVocabulary();
  }

  async registerDomainSeed(seed: DomainSeedDefinition): Promise<{
    applied: boolean;
  }> {
    this.domainSeedRegistry.set(seed.domainKey, seed);
    const domainSeedClient = this.getDomainSeedClient();
    if (!domainSeedClient) {
      return { applied: false };
    }
    await applyDomainSeed(domainSeedClient, seed);
    return { applied: true };
  }

  getRegisteredDomainSeeds(): DomainSeedDefinition[] {
    return Array.from(this.domainSeedRegistry.values()).map((seed) => ({
      ...seed,
      profile: { ...seed.profile },
      fields: seed.fields.map((field) => ({ ...field })),
      constraints: Object.fromEntries(
        Object.entries(seed.constraints).map(([type, fields]) => [
          type,
          [...fields],
        ]),
      ),
    }));
  }

  private async seedRegisteredDomainSeeds(): Promise<void> {
    const domainSeedClient = this.getDomainSeedClient();
    if (!domainSeedClient) {
      return;
    }
    for (const seed of this.domainSeedRegistry.values()) {
      await applyDomainSeed(domainSeedClient, seed);
    }
  }

  private async seedDefaultRoleVocabulary(): Promise<void> {
    if (!this.localClient) {
      return;
    }

    for (const role of DEFAULT_EVENT_ACTOR_ROLE_TERMS) {
      await this.localClient.execute({
        sql: `INSERT OR IGNORE INTO schema_vocab_term (
          vocab_key,
          term_key,
          label,
          description,
          is_system,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [
          EVENT_ACTOR_ROLE_VOCAB_KEY,
          role.termKey,
          role.label,
          null,
        ],
      });
    }
  }

  getLocal() {
    if (!this.localDb) {
      throw new Error(
        'Local database not initialised. Call initialiseLocal() first.',
      );
    }
    return this.localDb;
  }

  async configureRemote(url: string, authToken?: string): Promise<void> {
    try {
      this.remoteClient = createClient({ url, authToken });
      this.remoteDrizzle = drizzle(this.remoteClient, {
        schema: {
          articles,
          victims,
          perpetrators,
          users,
          events,
          annotationEvents,
          reportAnnotations,
          participants,
          schemaProfiles,
          schemaFields,
          actors,
          actorAliases,
          actorIdentifiers,
          schemaConstraints,
          schemaVocabTerms,
          eventActorRoles,
          claims,
          claimEvidence,
          appConfig,
          syncQueue,
        },
      });
      this.config.remote = { url, authToken, syncInterval: 15 };
      this.config.sync.enabled = true;
      // Test remote connection
      await this.remoteDrizzle.select().from(appConfig).limit(1);
      console.log('Remote database configured successfully');
    } catch (error) {
      console.error('Failed to configure remote database:', error);
      this.config.sync.enabled = false;
      throw error;
    }
  }

  // async addToSyncQueue(method: string, endpoint: string, body?: any) {
  //   const db = this.getLocal();
  //   await db.insert(syncQueue).values({
  //     method,
  //     endpoint,
  //     body,
  //     syncStatus: 'pending',
  //     queuedAt: new Date().toISOString(),
  //     failureCount: 0,
  //   });
  // }

  async getSyncQueue() {
    const db = this.getLocal();
    return await db
      .select()
      .from(syncQueue)
      .where(eq(syncQueue.syncStatus, 'pending'));
  }

  async processSyncQueue() {
    const db = this.getLocal();
    const queue = await db
      .select()
      .from(syncQueue)
      .where(eq(syncQueue.syncStatus, 'pending'));
    for (const entry of queue) {
      try {
        const { id, method, endpoint, body } = entry;
        const res = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: method === 'DELETE' ? undefined : JSON.stringify(body),
        });
        if (res.ok) {
          await db.delete(syncQueue).where(eq(syncQueue.id, id));
        } else {
          const status = res.status;
          const statusText = res.statusText;
          const newFailureCount = (entry.failureCount || 0) + 1;
          await db
            .update(syncQueue)
            .set({
              syncStatus: 'failed',
              lastError: `${status} ${statusText}`,
              failureCount: newFailureCount,
            })
            .where(eq(syncQueue.id, id));
        }
      } catch (err) {
        const newFailureCount = (entry.failureCount || 0) + 1;
        await db
          .update(syncQueue)
          .set({
            syncStatus: 'failed',
            lastError: 'Network or client error',
            failureCount: newFailureCount,
          })
          .where(eq(syncQueue.id, entry.id));
      }
    }
  }

  async purgeSyncQueue() {
    const db = this.getLocal();
    await db.delete(syncQueue);
  }

  async triggerSyncNow() {
    await this.processSyncQueue();
  }

  startAutoSync(): void {
    if (!this.config.sync.enabled || !this.config.remote?.syncInterval) {
      return;
    }
    const intervalMs = this.config.remote.syncInterval * 60 * 1000;
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncWithRemote();
      } catch (error) {
        console.error('Auto sync failed:', error);
      }
    }, intervalMs);
    console.log(
      `Auto sync started (interval: ${this.config.remote.syncInterval} minutes)`,
    );
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Auto sync stopped');
    }
  }

  async syncWithRemote(): Promise<void> {
    if (!this.config.sync.enabled || !this.localDb) {
      throw new Error('Sync not properly configured');
    }
    if (this.remoteDrizzle) {
      console.log('Starting manual database synchronization...');
      try {
        await this.syncTable('articles');
        await this.syncTable('victims');
        await this.syncTable('perpetrators');
        console.log('Manual database synchronization completed');
      } catch (error) {
        console.error('Sync failed:', error);
        throw error;
      }
      return;
    } else {
      throw new Error('No remoteDrizzle available for sync');
    }
  }

  private async syncTable(tableName: string): Promise<void> {
    console.log(`Syncing table: ${tableName}`);
    if (this.localDb) {
      // Update sync metadata (stub)
    }
  }

  getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<DatabaseConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  async createBackup(): Promise<string> {
    if (!this.localClient) {
      throw new Error('Local database client not initialised');
    }

    const dbPath = this.config.local.path;
    if (!dbPath) {
      throw new Error('Local database path is not configured');
    }

    const configuredBackupPath = this.config.local.backupPath;
    const defaultBackupDir = path.join(path.dirname(dbPath), 'backups');
    const backupTargetBase =
      configuredBackupPath ??
      path.join(defaultBackupDir, path.basename(dbPath));

    const parsedPath = path.parse(backupTargetBase);
    const backupDir = parsedPath.dir || defaultBackupDir;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `${parsedPath.name}-${timestamp}${parsedPath.ext || '.db'}`;
    const backupPath = path.join(backupDir, backupFilename);

    await fs.promises.mkdir(backupDir, { recursive: true });

    try {
      await this.localClient.execute('PRAGMA wal_checkpoint(FULL)');
    } catch (error) {
      console.warn('Failed to checkpoint WAL before backup:', error);
    }

    await fs.promises.copyFile(dbPath, backupPath);

    return backupPath;
  }

  async close(): Promise<void> {
    this.stopAutoSync();

    if (this.localClient) {
      await this.localClient.close();
      this.localClient = null;
    }

    if (this.remoteClient) {
      await this.remoteClient.close();
      this.remoteClient = null;
      this.remoteDrizzle = null;
    }

    this.localDb = null;
  }
}

export const dbm = new DatabaseManagerServer();
export { DatabaseManagerServer };
