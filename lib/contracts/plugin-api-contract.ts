export interface ActorPayload {
  id: string;
  canonicalLabel: string;
  actorKind: string;
  aliases: string[];
}

export interface EventPayload {
  id: string;
  title: string;
  occurredOn: string | null;
  location: string | null;
}

export interface ClaimRecordPayload {
  id: string;
  eventId: string;
  recordType: 'homicide' | 'claim';
  summary: string;
}

export interface VictimPayload {
  id: string;
  eventId: string;
  name: string;
}

export interface PerpetratorPayload {
  id: string;
  eventId: string;
  name: string;
}

export interface ParticipantPayload {
  id: string;
  eventId: string;
  actorId: string;
  role: string;
}

export interface ListResult<TItem> {
  items: TItem[];
  total: number;
}

export interface PluginApiError {
  code: string;
  message: string;
}

export interface PluginSuccessListResponse<TItem> {
  success: true;
  data: ListResult<TItem>;
}

export interface PluginSuccessEntityResponse<TEntity> {
  success: true;
  data: TEntity;
}

export interface PluginErrorResponse {
  success: false;
  error: PluginApiError;
}

export type PluginApiListResponse<TItem> =
  | PluginSuccessListResponse<TItem>
  | PluginErrorResponse;

export type PluginApiResponse<TData> =
  | PluginSuccessEntityResponse<TData>
  | PluginErrorResponse;
