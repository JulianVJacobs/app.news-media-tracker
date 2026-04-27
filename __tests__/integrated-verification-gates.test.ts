/** @jest-environment node */
import { GET as getHealthRoute } from '../app/api/health/route';
import { bootstrapPlugin } from '../plugin/bootstrap';
import type {
  ActorPayload,
  ClaimArchivalLinkPayload,
  ClaimRecordPayload,
  EventPayload,
  PerpetratorPayload,
  ParticipantPayload,
  PluginDomainServices,
  VictimPayload,
} from '../plugin/contracts/plugin-api-contract';

const createListService = <T extends { id: string }>(
  seed: T,
  createShape: (input: Omit<T, 'id'>) => T,
) => ({
  list: jest.fn(async () => ({ items: [seed], total: 1 })),
  create: jest.fn(async (input: Omit<T, 'id'>) => createShape(input)),
});

const createVerificationServices = (): PluginDomainServices => {
  const actorSeed: ActorPayload = {
    id: 'actor-1',
    canonicalLabel: 'Jane Doe',
    actorKind: 'person',
    aliases: [],
  };
  const eventSeed: EventPayload = {
    id: 'event-1',
    title: 'Case event',
    occurredOn: '2026-01-01',
    location: 'Johannesburg',
  };
  const claimSeed: ClaimRecordPayload = {
    id: 'claim-1',
    eventId: 'event-1',
    recordType: 'homicide',
    summary: 'Victim found at location',
  };
  const claimLinkSeed: ClaimArchivalLinkPayload = {
    id: 'link-1',
    claimId: 'claim-1',
    linkedRecordType: 'authority_record',
    linkedRecordId: 'QUBIT-AR-1',
  };
  const victimSeed: VictimPayload = {
    id: 'victim-1',
    eventId: 'event-1',
    name: 'Victim Name',
  };
  const perpetratorSeed: PerpetratorPayload = {
    id: 'perp-1',
    eventId: 'event-1',
    name: 'Perpetrator Name',
  };
  const participantSeed: ParticipantPayload = {
    id: 'participant-1',
    eventId: 'event-1',
    actorId: 'actor-1',
    role: 'witness',
  };

  return {
    actors: createListService(actorSeed, (input) => ({ id: 'actor-2', ...input })),
    events: createListService(eventSeed, (input) => ({ id: 'event-2', ...input })),
    claims: createListService(claimSeed, (input) => ({ id: 'claim-2', ...input })),
    claimArchivalLinks: {
      listByClaimId: jest.fn(async () => ({ items: [claimLinkSeed], total: 1 })),
      create: jest.fn(async (input) => ({ id: 'link-2', ...input })),
    },
    victims: createListService(victimSeed, (input) => ({ id: 'victim-2', ...input })),
    perpetrators: createListService(perpetratorSeed, (input) => ({
      id: 'perp-2',
      ...input,
    })),
    participants: createListService(participantSeed, (input) => ({
      id: 'participant-2',
      ...input,
    })),
  };
};

describe('integrated verification gates', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('stack startup gate: API health route responds healthy', async () => {
    const response = await getHealthRoute();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: 'healthy',
      message: 'Homicide Media Tracker API is running',
      environment: expect.anything(),
      version: expect.any(String),
    });
    expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('bootstrap and plugin route health gates pass', async () => {
    const plugin = bootstrapPlugin(createVerificationServices());

    const bootstrapResponse = await plugin.dispatch('GET', '/');
    expect(bootstrapResponse.status).toBe(200);
    expect(bootstrapResponse.body).toMatchObject({
      success: true,
      data: {
        registered: true,
        pluginId: 'access-homicide-tracker',
      },
    });

    const actorsResponse = await plugin.dispatch('GET', '/actors', {
      auth: { userId: 'verifier', permissions: ['actors:read'] },
      query: { limit: '1', offset: '0' },
    });
    expect(actorsResponse.status).toBe(200);
    expect(actorsResponse.body).toEqual({
      success: true,
      data: {
        items: [
          {
            id: 'actor-1',
            canonicalLabel: 'Jane Doe',
            actorKind: 'person',
            aliases: [],
          },
        ],
        total: 1,
      },
    });
  });

  it('host-shell access gate: preload exposes IPC-backed bridge contract', async () => {
    const invoke = jest.fn(async (channel: string) => {
      if (channel === 'database-status') {
        return {
          isInitialised: true,
          syncEnabled: false,
          localPath: '/tmp/local.db',
          remoteUrl: null,
        };
      }
      if (channel === 'database-sync') {
        return { success: true };
      }
      if (channel === 'database-backup') {
        return { success: true, backupPath: '/tmp/backup.db' };
      }
      return 3000;
    });
    const exposeInMainWorld = jest.fn();

    jest.doMock('electron', () => ({
      contextBridge: {
        exposeInMainWorld,
      },
      ipcRenderer: {
        send: jest.fn(),
        on: jest.fn(),
        removeListener: jest.fn(),
        once: jest.fn(),
        invoke,
      },
    }));

    jest.isolateModules(() => {
      require('../src/main/preload');
    });

    expect(exposeInMainWorld).toHaveBeenCalledWith('electron', expect.any(Object));
    const [, bridge] = exposeInMainWorld.mock.calls[0];

    await expect(bridge.app.getServerPort()).resolves.toBe(3000);
    await expect(bridge.database.getStatus()).resolves.toMatchObject({
      isInitialised: true,
      localPath: '/tmp/local.db',
    });
    await expect(bridge.database.sync()).resolves.toEqual({ success: true });
    await expect(bridge.database.createBackup()).resolves.toEqual({
      success: true,
      backupPath: '/tmp/backup.db',
    });

    expect(invoke).toHaveBeenCalledWith('get-server-port');
    expect(invoke).toHaveBeenCalledWith('database-status');
    expect(invoke).toHaveBeenCalledWith('database-sync');
    expect(invoke).toHaveBeenCalledWith('database-backup');
  });
});
