import {
  WORKBENCH_HOST_SHELL_ENTRY_POINTS,
  resolveWorkbenchHostedRuntime,
} from './host-shell';

describe('workbench host shell helpers', () => {
  it('defines stable entry points for hosted workbench navigation', () => {
    expect(WORKBENCH_HOST_SHELL_ENTRY_POINTS).toEqual([
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
    ]);
  });

  it('prefers explicit runtime mode and route prefix from host environment', () => {
    expect(
      resolveWorkbenchHostedRuntime({
        WORKBENCH_PLUGIN_RUNTIME_MODE: 'hosted-atom',
        WORKBENCH_PLUGIN_API_ROUTE_PREFIX: '/api/workbench',
      }),
    ).toEqual({
      mode: 'hosted-atom',
      routePrefix: '/api/workbench',
    });
  });

  it('falls back to defaults when hosted runtime env values are missing', () => {
    expect(resolveWorkbenchHostedRuntime({})).toEqual({
      mode: 'default',
      routePrefix: '/api/workbench',
    });
  });
});
