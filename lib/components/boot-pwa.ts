'use client';
import { useEffect } from 'react';

export default function BootPWA() {
  useEffect(() => {
    const requestPersistentStorage = async () => {
      if (!('storage' in navigator) || !navigator.storage.persist) {
        return false;
      }

      try {
        if (await navigator.storage.persisted?.()) {
          return true;
        }

        const granted = await navigator.storage.persist();
        if (!granted) {
          console.warn('[SW] storage persistence not granted');
        } else {
          console.info('[SW] storage persistence granted');
        }
        return granted;
      } catch (error) {
        console.warn('[SW] storage persistence request failed', error);
        return false;
      }
    };

    if ('serviceWorker' in navigator) {
      const register = async () => {
        try {
          const registration =
            await navigator.serviceWorker.register('/service-worker.js');
          console.info(
            '[SW] registered',
            registration.scope,
            registration.updateViaCache,
          );
          void requestPersistentStorage();
        } catch (error) {
          console.error('[SW] registration failed', error);
        }
      };

      if (document.readyState === 'complete') {
        void register();
      } else {
        const handleLoad = () => {
          void register();
        };
        window.addEventListener('load', handleLoad, { once: true });
        return () => window.removeEventListener('load', handleLoad);
      }
    } else {
      void requestPersistentStorage();
    }
  }, []);
  return null;
}
