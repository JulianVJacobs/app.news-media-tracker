export type WorkbenchPluginRuntimeMode = 'legacy' | 'hosted-atom';

export interface WorkbenchPluginRuntimeConfig {
  mode: WorkbenchPluginRuntimeMode;
  routePrefix: string;
}

const DEFAULT_ROUTE_PREFIX = '/api/workbench';

const normalizeRoutePrefix = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_ROUTE_PREFIX;
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  // If the value is only slashes, normalization yields an empty string and
  // intentionally falls back to the default hosted workbench route prefix.
  return withLeadingSlash.replace(/\/+$/, '') || DEFAULT_ROUTE_PREFIX;
};

export const resolveWorkbenchPluginRuntimeConfig = (
  env: NodeJS.ProcessEnv = process.env,
): WorkbenchPluginRuntimeConfig => {
  const modeValue = (
    env.WORKBENCH_PLUGIN_RUNTIME_MODE ??
    env.PLUGIN_RUNTIME_MODE ??
    'legacy'
  )
    .trim()
    .toLowerCase();
  const routePrefix = normalizeRoutePrefix(
    env.WORKBENCH_PLUGIN_API_ROUTE_PREFIX ??
      env.PLUGIN_API_ROUTE_PREFIX ??
      DEFAULT_ROUTE_PREFIX,
  );

  return {
    mode: modeValue === 'hosted-atom' ? 'hosted-atom' : 'legacy',
    routePrefix,
  };
};
