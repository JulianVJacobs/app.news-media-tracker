export type WorkbenchHostShellEntryPoint = {
  id: 'home' | 'event-intake' | 'event-list';
  href: '/workbench' | '/workbench/events/new' | '/workbench/events';
  label: string;
  summary: string;
};

export const WORKBENCH_HOST_SHELL_ENTRY_POINTS: WorkbenchHostShellEntryPoint[] =
  [
    {
      id: 'home',
      href: '/workbench',
      label: 'Workbench Home',
      summary: 'Open the hosted workbench landing view inside AtoM shell.',
    },
    {
      id: 'event-intake',
      href: '/workbench/events/new',
      label: 'Event Intake',
      summary: 'Capture a new event through the hosted workbench surface.',
    },
    {
      id: 'event-list',
      href: '/workbench/events',
      label: 'Event List',
      summary: 'Review and filter existing events from the hosted shell.',
    },
  ];

type RuntimeEnvironment = Record<string, string | undefined>;

export const resolveWorkbenchHostedRuntime = (env: RuntimeEnvironment) => {
  const mode =
    env.WORKBENCH_PLUGIN_RUNTIME_MODE ||
    env.NEXT_PUBLIC_WORKBENCH_PLUGIN_RUNTIME_MODE ||
    'default';
  const routePrefix =
    env.WORKBENCH_PLUGIN_API_ROUTE_PREFIX ||
    env.NEXT_PUBLIC_WORKBENCH_PLUGIN_API_ROUTE_PREFIX ||
    '/api/workbench';

  return {
    mode,
    routePrefix,
  };
};
