import { Workbox } from 'workbox-window';

let wb: Workbox | null = null;

/**
 * Register the service worker
 */
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    try {
      wb = new Workbox('/sw.js');

      // Add event listener for when a new service worker is waiting
      wb.addEventListener('waiting', () => {
        console.log('New service worker is waiting');
        // You can show a prompt to the user here to reload the page
        showUpdatePrompt();
      });

      // Add event listener for when the service worker is activated
      wb.addEventListener('activated', (event) => {
        console.log('Service worker activated');
        if (!event.isUpdate) {
          console.log('Service worker activated for the first time');
        }
      });

      // Register the service worker
      await wb.register();
      console.log('Service worker registered successfully');

      // Check for updates every hour
      setInterval(() => {
        wb?.update();
      }, 60 * 60 * 1000);

      return wb;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  }
  return null;
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    console.log('Service worker unregistered');
  }
}

/**
 * Check if the app is running in standalone mode (PWA)
 */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Show update prompt to user
 */
function showUpdatePrompt() {
  if (
    confirm(
      'A new version of the app is available. Would you like to update now?'
    )
  ) {
    wb?.messageSkipWaiting();
    window.location.reload();
  }
}

/**
 * Get cache size
 */
export async function getCacheSize(): Promise<number> {
  if (!('caches' in window)) return 0;
  
  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();

      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Error calculating cache size:', error);
    return 0;
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  if (!('caches' in window)) return;
  
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    console.log('All caches cleared');
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
}

/**
 * Check if user is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen to online/offline events
 */
export function setupOnlineStatusListener(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  const handleOnline = () => onOnline();
  const handleOffline = () => onOffline();

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
