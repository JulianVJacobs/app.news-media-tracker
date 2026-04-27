export const OFFLINE_SYNC_ENDPOINT = '/api/sync';
export const OFFLINE_SYNC_TAG = 'sync-api-posts';
export const OFFLINE_QUEUE_DB = 'offline-post-queue';
export const OFFLINE_QUEUE_STORE = 'queue';

export type OfflineReplayOperation = {
  queueId?: number;
  requestId?: string;
  method: string;
  endpoint: string;
  body?: unknown;
};
