function showUpdateNotification(newWorker: ServiceWorker): void {
  if (document.querySelector('#sw-update-toast')) {
    return;
  }

  const toast = document.createElement('div');
  toast.id = 'sw-update-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <span>Neue Version verfügbar!</span>
    <button id="sw-update-btn" aria-label="Neue Version laden">Aktualisieren</button>
    <button id="sw-dismiss-btn" aria-label="Benachrichtigung schließen">×</button>
  `;
  document.body.append(toast);

  const updateButton = document.querySelector('#sw-update-btn');
  if (updateButton) {
    updateButton.addEventListener('click', () => {
      newWorker.postMessage({ type: 'SKIP_WAITING' });
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
          globalThis.location.reload();
        },
        { once: true },
      );
    });
  }

  const dismissButton = document.querySelector('#sw-dismiss-btn');
  if (dismissButton) {
    dismissButton.addEventListener('click', () => {
      toast.remove();
    });
  }
}

// Auto-initialize service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('{{BASE_PATH}}/service-worker.js')
      .then((registration) => {
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) {
            void registration.update();
          }
        });

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          // Guard against null (race condition fix)
          if (!newWorker) {
            return;
          }

          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              showUpdateNotification(newWorker);
            }
            return;
          }

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              showUpdateNotification(newWorker);
            }
          });
        });

        return registration;
      })
      .catch((error: unknown) => {
        console.error('SW registration failed:', error);
      });
  });
}
