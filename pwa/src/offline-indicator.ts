interface OfflineIndicatorState {
  hideOnlineTimer: NodeJS.Timeout | null;
  removeTimer: NodeJS.Timeout | null;
}

let hideOnlineTimer: NodeJS.Timeout | null = null;
let removeTimer: NodeJS.Timeout | null = null;

function getOrCreateIndicator(): HTMLElement {
  const existingIndicator =
    document.querySelector<HTMLElement>('#offline-indicator');

  if (existingIndicator) {
    return existingIndicator;
  }

  const indicator = document.createElement('div');
  indicator.id = 'offline-indicator';
  indicator.className = 'offline-toast';
  indicator.setAttribute('role', 'status');
  indicator.setAttribute('aria-live', 'polite');
  document.body.append(indicator);

  return indicator;
}

function showOfflineIndicator(): void {
  if (hideOnlineTimer) {
    clearTimeout(hideOnlineTimer);
    hideOnlineTimer = null;
  }
  if (removeTimer) {
    clearTimeout(removeTimer);
    removeTimer = null;
  }

  const indicator = getOrCreateIndicator();

  indicator.innerHTML = `
    <span class="offline-icon">📵</span>
    <div class="offline-content">
      <strong>Keine Internetverbindung</strong>
      <span class="offline-message">Bereits geladene Inhalte bleiben verfügbar</span>
    </div>
  `;

  indicator.classList.remove('online');
  indicator.classList.add('offline');

  // Trigger reflow for animation (read offsetHeight to force layout recalculation)
  indicator.offsetHeight; // eslint-disable-line @typescript-eslint/no-unused-expressions
  indicator.classList.add('show');
}

function showOnlineNotification(): void {
  if (hideOnlineTimer) {
    clearTimeout(hideOnlineTimer);
    hideOnlineTimer = null;
  }
  if (removeTimer) {
    clearTimeout(removeTimer);
    removeTimer = null;
  }

  const indicator = getOrCreateIndicator();

  indicator.innerHTML = `
    <span class="offline-icon">✅</span>
    <div class="offline-content">
      <strong>Wieder online</strong>
      <span class="offline-message">Verbindung wiederhergestellt</span>
    </div>
  `;

  indicator.classList.remove('offline');
  indicator.classList.add('show', 'online');

  hideOnlineTimer = setTimeout(() => {
    indicator.classList.remove('show');

    removeTimer = setTimeout(() => {
      if (!indicator.classList.contains('show')) {
        indicator.remove();
      }
      removeTimer = null;
    }, 300);

    hideOnlineTimer = null;
  }, 3000);
}

globalThis.addEventListener('offline', showOfflineIndicator);
globalThis.addEventListener('online', showOnlineNotification);

export type { OfflineIndicatorState };
