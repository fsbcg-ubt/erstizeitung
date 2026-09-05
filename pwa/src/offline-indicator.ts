let hideOnlineTimer: ReturnType<typeof setTimeout> | null = null;
let removalTimer: ReturnType<typeof setTimeout> | null = null;

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
  if (removalTimer) {
    clearTimeout(removalTimer);
    removalTimer = null;
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
  if (removalTimer) {
    clearTimeout(removalTimer);
    removalTimer = null;
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

    removalTimer = setTimeout(() => {
      if (!indicator.classList.contains('show')) {
        indicator.remove();
      }
      removalTimer = null;
    }, 300);

    hideOnlineTimer = null;
  }, 3000);
}

globalThis.addEventListener('offline', showOfflineIndicator);
globalThis.addEventListener('online', showOnlineNotification);
