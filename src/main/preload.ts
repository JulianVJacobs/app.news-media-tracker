// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
/* eslint @typescript-eslint/no-var-requires: off */
import { type DomainSeedDefinition } from '../../lib/db/domain-seed';

export type Channels = 'ipc-example';

type ElectronModule = typeof import('electron');

const electronModule: ElectronModule | null = (() => {
  try {
    return require('electron') as ElectronModule;
  } catch {
    return null;
  }
})();

const contextBridge = electronModule?.contextBridge;
const ipcRenderer = electronModule?.ipcRenderer;

const nonElectronError = () =>
  new Error('Electron IPC bridge is unavailable in this runtime');

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer?.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: unknown, ...args: unknown[]) =>
        func(...args);
      if (!ipcRenderer) {
        return () => {};
      }
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer?.once(channel, (_event, ...args) => func(...args));
    },
    invoke(channel: string, ...args: unknown[]): Promise<unknown> {
      if (!ipcRenderer) {
        return Promise.reject(nonElectronError());
      }
      return ipcRenderer.invoke(channel, ...args);
    },
  },
  // App information
  app: {
    getVersion: (): Promise<string> =>
      ipcRenderer
        ? ipcRenderer.invoke('get-app-version')
        : Promise.reject(nonElectronError()),
    getPlatform: (): Promise<string> =>
      ipcRenderer
        ? ipcRenderer.invoke('get-platform')
        : Promise.reject(nonElectronError()),
    getServerPort: (): Promise<number> =>
      ipcRenderer
        ? ipcRenderer.invoke('get-server-port')
        : Promise.reject(nonElectronError()),
  },
  // Database operations
  database: {
    getStatus: (): Promise<{
      isInitialised: boolean;
      syncEnabled: boolean;
      localPath: string;
      remoteUrl: string | null;
      error?: string;
    }> =>
      ipcRenderer
        ? ipcRenderer.invoke('database-status')
        : Promise.reject(nonElectronError()),

    sync: (): Promise<{
      success: boolean;
      error?: string;
    }> =>
      ipcRenderer
        ? ipcRenderer.invoke('database-sync')
        : Promise.reject(nonElectronError()),

    createBackup: (): Promise<{
      success: boolean;
      backupPath?: string;
      error?: string;
    }> =>
      ipcRenderer
        ? ipcRenderer.invoke('database-backup')
        : Promise.reject(nonElectronError()),

    getDomainSeeds: (): Promise<{
      success: boolean;
      data?: DomainSeedDefinition[];
      error?: string;
    }> =>
      ipcRenderer
        ? ipcRenderer.invoke('database-domain-seeds')
        : Promise.reject(nonElectronError()),

    registerDomainSeed: (
      seed: DomainSeedDefinition,
    ): Promise<{
      success: boolean;
      data?: DomainSeedDefinition[];
      error?: string;
    }> =>
      ipcRenderer
        ? ipcRenderer.invoke('database-register-domain-seed', seed)
        : Promise.reject(nonElectronError()),
  },
};

if (contextBridge?.exposeInMainWorld) {
  contextBridge.exposeInMainWorld('electron', electronHandler);
}

export type ElectronHandler = typeof electronHandler;
