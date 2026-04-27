import type {
  PluginApiListResponse,
  PluginApiResponse,
} from '../contracts/plugin-api-contract';
import { resolveWorkbenchPluginRuntimeConfig } from './plugin-runtime-config';

export type WorkbenchPluginResource =
  | 'actors'
  | 'events'
  | 'claims'
  | 'victims'
  | 'perpetrators'
  | 'participants';

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '');
const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const toConfiguredBaseUrl = (): string | null => {
  const raw =
    process.env.WORKBENCH_PLUGIN_API_BASE_URL ||
    process.env.PLUGIN_API_BASE_URL ||
    process.env.NEXT_PUBLIC_PLUGIN_API_BASE_URL ||
    '';
  const base = raw.trim();
  if (base) {
    return normalizeBaseUrl(base);
  }

  // Preserve 3.0.x precedence for explicit base URL env vars; only fall back to
  // hosted route-prefix mode when no base URL is configured.
  const runtimeConfig = resolveWorkbenchPluginRuntimeConfig();
  return runtimeConfig.mode === 'hosted-atom'
    ? runtimeConfig.routePrefix
    : null;
};

export const isWorkbenchPluginApiEnabled = (): boolean =>
  Boolean(toConfiguredBaseUrl());

const buildResourceUrl = (
  resource: WorkbenchPluginResource,
  query: Record<string, string | number | undefined> = {},
): string => {
  const baseUrl = toConfiguredBaseUrl();
  if (!baseUrl) {
    throw new Error('Workbench plugin API base URL is not configured');
  }

  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    queryParams.set(key, String(value));
  }

  const resourcePath = `${normalizeBaseUrl(baseUrl)}/${resource}`;
  // Relative hosted route prefixes (e.g. /api/workbench) cannot be parsed by
  // URL without a base origin, so they use path concatenation while absolute
  // base URLs use URL for robust query serialization.
  if (!isAbsoluteUrl(baseUrl)) {
    const queryString = queryParams.toString();
    return queryString ? `${resourcePath}?${queryString}` : resourcePath;
  }

  const url = new URL(resourcePath);
  queryParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
};

const parseJson = async <T>(response: Response): Promise<T> => {
  return (await response.json()) as T;
};

const toPluginErrorMessage = (
  payload: { success: false; error: { message?: string } } | undefined,
  fallback: string,
): string => payload?.error?.message || fallback;

export const listPluginResource = async <TItem>(
  resource: WorkbenchPluginResource,
  query: Record<string, string | number | undefined> = {},
): Promise<{ items: TItem[]; total: number }> => {
  const response = await fetch(buildResourceUrl(resource, query), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    // Plugin-backed list data should always be fresh in the workbench.
    cache: 'no-store',
  });

  const payload = await parseJson<PluginApiListResponse<TItem>>(response);

  if (!response.ok || !payload.success) {
    throw new Error(
      toPluginErrorMessage(
        payload.success ? undefined : payload,
        `Plugin API list request failed with status ${response.status}`,
      ),
    );
  }

  return payload.data;
};

export const createPluginResource = async <TInput, TEntity>(
  resource: WorkbenchPluginResource,
  body: TInput,
): Promise<TEntity> => {
  const response = await fetch(buildResourceUrl(resource), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await parseJson<PluginApiResponse<TEntity>>(response);

  if (!response.ok || !payload.success) {
    throw new Error(
      toPluginErrorMessage(
        payload.success ? undefined : payload,
        `Plugin API create request failed with status ${response.status}`,
      ),
    );
  }

  return payload.data;
};
