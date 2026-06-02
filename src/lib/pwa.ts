// PWA Registration and Service Worker management

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available, prompt user to refresh
              showUpdatePrompt();
            }
          });
        }
      });

      console.log('Service Worker registered:', registration.scope);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

function showUpdatePrompt() {
  // Dispatch custom event for UI to handle update prompt
  const event = new CustomEvent('sw-update-available');
  window.dispatchEvent(event);
}

export function requestNotificationPermission() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return Promise.resolve(false);
  }

  return Notification.requestPermission();
}

export async function subscribeToPush(registration: ServiceWorkerRegistration) {
  if (!('PushManager' in window)) {
    return null;
  }

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
      ),
    });

    console.log('Push subscription:', subscription);
    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// Check if app is installed (PWA)
export function isPWAInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

// Get install prompt
export function getInstallPrompt(): { prompt: () => void; outcome: Promise<'accepted' | 'dismissed' | 'canceled'> } | null {
  if (!('beforeinstallprompt' in window)) {
    return null;
  }

  let deferredPrompt: beforeinstallpromptEvent | null = null;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
  });

  return {
    prompt: () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
      }
    },
    outcome: new Promise((resolve) => {
      if (deferredPrompt) {
        deferredPrompt.userChoice.then((choiceResult) => {
          deferredPrompt = null;
          resolve(choiceResult.outcome as 'accepted' | 'dismissed' | 'canceled');
        });
      } else {
        resolve('dismissed');
      }
    }),
  };
}

// Share API for native sharing
export async function shareContent(content: {
  title: string;
  text: string;
  url?: string;
}): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }

  try {
    await navigator.share(content);
    return true;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Share failed:', error);
    }
    return false;
  }
}