export const getBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
};
export const isOnline = () => {
  return typeof window !== 'undefined' && window.navigator.onLine;
};
// Platform detection utilities for dual Next.js/Electron app

export const isElectron = () => {
  return (
    typeof window !== 'undefined' &&
    window.process &&
    window.process.type === 'renderer'
  );
};

export const isWeb = () => {
  return !isElectron();
};

export const getEnvironment = () => {
  if (typeof window === 'undefined') return 'server';
  return isElectron() ? 'electron' : 'web';
};

// Type definitions for Electron in window
declare global {
  interface Window {
    process?: {
      type?: string;
    };
    electron?: {
      // Add your electron API methods here
      ipcRenderer: {
        invoke: <T = unknown>(
          channel: string,
          ...args: unknown[]
        ) => Promise<T>;
        on: (channel: string, func: (...args: unknown[]) => void) => void;
        removeAllListeners: (channel: string) => void;
      };
    };
  }
}

const platformUtils = {
  isElectron,
  isWeb,
  getEnvironment,
  isOnline,
  getBaseUrl,
};

export default platformUtils;
