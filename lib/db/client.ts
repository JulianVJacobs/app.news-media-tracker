import Dexie, { Table } from 'dexie';
import {
  Article,
  Victim,
  Perpetrator,
  User,
  Event,
  ReportAnnotation,
  Participant,
  Actor,
  ActorAlias,
  ActorIdentifier,
  SchemaField,
  SchemaVocabTerm,
  AnnotationEvent,
  EventActorRole,
  Claim,
  ClaimEvidence,
  SyncQueue,
  NewSyncQueue,
  AppConfig,
  migrations,
} from './schema';

// Dexie subclass for local DB
class NewsReportTrackerDexie extends Dexie {
  articles!: Table<Article, string>;
  victims!: Table<Victim, string>;
  perpetrators!: Table<Perpetrator, string>;
  users!: Table<User, string>;
  events!: Table<Event, string>;
  reportAnnotations!: Table<ReportAnnotation, string>;
  participants!: Table<Participant, string>;
  actors!: Table<Actor, string>;
  actorAliases!: Table<ActorAlias, string>;
  actorIdentifiers!: Table<ActorIdentifier, string>;
  schemaFields!: Table<SchemaField, string>;
  schemaVocabTerms!: Table<SchemaVocabTerm, number>;
  annotationEvents!: Table<AnnotationEvent, string>;
  eventActorRoles!: Table<EventActorRole, string>;
  claims!: Table<Claim, string>;
  claimEvidence!: Table<ClaimEvidence, string>;
  syncQueue!: Table<SyncQueue, number>;
  appConfig!: Table<AppConfig, number>;

  constructor() {
    super('NewsReportTrackerDB');
    // SQL parser to generate Dexie schema string from migration SQL
    // Helper to convert snake_case to camelCase
    const toCamelCase = (str: string) =>
      str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

    const parseDexieSchemaFromSQL = (sql: string): string => {
      // Extract column definitions between parentheses (multiline compatible)
      const match = sql.match(/\(([^]*)\)/);
      if (!match) return '';
      const columnsBlock = match[1];
      const lines = columnsBlock
        .split(/,\s*\n|,\s*/)
        .map((l) => l.trim())
        .filter(Boolean);
      const keys: string[] = [];
      let pkField = '';
      let autoIncField = '';
      const uniqueFields: string[] = [];
      for (const line of lines) {
        // Column definition: name TYPE ...
        const colMatch = line.match(/^([a-zA-Z0-9_]+)\s+([A-Z]+)(.*)$/i);
        if (!colMatch) continue;
        const [, colName, , rest] = colMatch;
        const camelColName = toCamelCase(colName);
        const restUpper = rest.toUpperCase();
        if (restUpper.includes('PRIMARY KEY')) {
          pkField = camelColName;
          if (restUpper.includes('AUTOINCREMENT')) {
            autoIncField = camelColName;
          }
        }
        if (restUpper.includes('UNIQUE')) {
          uniqueFields.push(camelColName);
        }
      }
      for (const line of lines) {
        const colMatch = line.match(/^([a-zA-Z0-9_]+)\s+/);
        if (!colMatch) continue;
        const colName = colMatch[1];
        const camelColName = toCamelCase(colName);
        if (camelColName === autoIncField) {
          keys.unshift(`++${camelColName}`);
        } else if (camelColName === pkField) {
          keys.unshift(camelColName);
        } else if (uniqueFields.includes(camelColName)) {
          keys.push(`&${camelColName}`);
        } else {
          keys.push(camelColName);
        }
      }
      return keys.join(', ');
    };

    // Dynamically map CREATE TABLE migration SQL to Dexie store keys
    const stores: Record<string, string> = {};
    for (const mig of migrations) {
      const tableMatch = mig.match(
        /CREATE TABLE IF NOT EXISTS ([a-zA-Z0-9_]+)/,
      );
      if (!tableMatch) {
        continue;
      }
      const tableName = tableMatch[1];
      const camelTableName = toCamelCase(tableName);
      const schema = parseDexieSchemaFromSQL(mig);
      if (schema) {
        stores[camelTableName] = schema;
      }
    }
    this.version(2).stores(stores);
  }
}

// Shared config type
export interface DatabaseConfig {
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

class DatabaseManagerClient {
  private localDb: NewsReportTrackerDexie | null = null;
  private config: DatabaseConfig;

  constructor() {
    // Browser: use localStorage or other web APIs for config if needed
    this.config = {
      sync: {
        enabled: false,
        conflictResolution: 'local',
      },
    };
  }

  async ensureDatabaseInitialised(): Promise<void> {
    if (!this.localDb) {
      await this.initialiseLocal();
    }
  }

  async initialiseLocal(): Promise<void> {
    this.localDb = new NewsReportTrackerDexie();
    await this.localDb.open();
  }

  getLocal() {
    if (!this.localDb) {
      throw new Error(
        'Local database not initialised. Call initialiseLocal() first.',
      );
    }
    return this.localDb;
  }

  getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<DatabaseConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  async addToSyncQueue(method: string, endpoint: string, body?: unknown) {
    const db = this.getLocal();
    const payload: NewSyncQueue = {
      method,
      endpoint,
      body: body ?? null,
      syncStatus: 'pending',
      queuedAt: new Date().toISOString(),
      failureCount: 0,
      lastError: null,
    };

    await db.syncQueue.add(payload as SyncQueue);
  }
}

export const dbm = new DatabaseManagerClient();
export { DatabaseManagerClient };
