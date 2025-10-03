// Custom interface for BeforeInstallPromptEvent (not in standard TypeScript lib)
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallButtonHandlers {
  appInstalled: () => void;
  beforeInstallPrompt: (event: Event) => void;
  beforeUnload: () => void;
}

type InstallWindow = Window &
  typeof globalThis & {
    __pwaInstallButtonHandlers__?: InstallButtonHandlers;
  };

const ENGAGEMENT_KEY = 'pwa-engagement';
const DISMISS_KEY = 'pwa-install-dismissed';
const MIN_ENGAGEMENT_TIME = 30_000; // 30 seconds
const MIN_VISITS = 2;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let trackingStartTime: number | null = null;

const installWindow = globalThis as InstallWindow;

interface EngagementData {
  firstVisit: number;
  lastVisit: number;
  totalTime: number;
  visitCount: number;
}

function createDefaultEngagementData(): EngagementData {
  const now = Date.now();
  return { firstVisit: now, lastVisit: now, totalTime: 0, visitCount: 0 };
}

function normalizeEngagementData(
  candidate: Partial<EngagementData> | null | undefined,
): EngagementData {
  const now = Date.now();
  return {
    firstVisit:
      typeof candidate?.firstVisit === 'number' && candidate.firstVisit > 0
        ? candidate.firstVisit
        : now,
    lastVisit:
      typeof candidate?.lastVisit === 'number' && candidate.lastVisit > 0
        ? candidate.lastVisit
        : now,
    totalTime:
      typeof candidate?.totalTime === 'number' && candidate.totalTime >= 0
        ? candidate.totalTime
        : 0,
    visitCount:
      typeof candidate?.visitCount === 'number' && candidate.visitCount >= 0
        ? candidate.visitCount
        : 0,
  };
}

function getEngagementData(): EngagementData {
  const data = localStorage.getItem(ENGAGEMENT_KEY);
  if (!data) {
    return createDefaultEngagementData();
  }

  try {
    const parsed = JSON.parse(data) as Partial<EngagementData>;
    return normalizeEngagementData(parsed);
  } catch {
    localStorage.removeItem(ENGAGEMENT_KEY);
    return createDefaultEngagementData();
  }
}

function updateEngagementData(): void {
  const data = getEngagementData();
  data.visitCount += 1;
  data.lastVisit = Date.now();
  localStorage.setItem(ENGAGEMENT_KEY, JSON.stringify(data));
}

function startTimeTracking(): void {
  trackingStartTime ??= Date.now();
}

function saveTimeSpent(): void {
  if (trackingStartTime !== null) {
    const data = getEngagementData();
    data.totalTime += Date.now() - trackingStartTime;
    localStorage.setItem(ENGAGEMENT_KEY, JSON.stringify(data));
    trackingStartTime = null;
  }
}

function shouldShowInstallPrompt(): boolean {
  if (localStorage.getItem(DISMISS_KEY)) {
    return false;
  }

  const data = getEngagementData();

  return data.visitCount >= MIN_VISITS || data.totalTime >= MIN_ENGAGEMENT_TIME;
}

function showInstallButton(): void {
  if (!shouldShowInstallPrompt()) {
    return;
  }

  const existingButton = document.querySelector('#install-pwa-btn');
  if (existingButton) {
    return;
  }

  const button = document.createElement('button');
  button.id = 'install-pwa-btn';
  button.setAttribute('aria-label', 'Erstizeitung als App installieren');
  button.innerHTML = `
    <span class="install-icon">📱</span>
    <span class="install-text">App installieren</span>
  `;
  document.body.append(button);

  setTimeout(() => {
    button.style.display = 'flex';
  }, 100);

  button.addEventListener('click', () => {
    void (async () => {
      if (deferredPrompt) {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          // Intentionally empty - just wait for outcome
        }
        deferredPrompt = null;
        button.remove();
      }
    })();
  });

  const dismissButton = document.createElement('button');
  dismissButton.className = 'install-dismiss-btn';
  dismissButton.textContent = '×';
  dismissButton.setAttribute('aria-label', 'Installation-Hinweis schließen');
  button.append(dismissButton);

  dismissButton.addEventListener('click', (event: MouseEvent): void => {
    event.stopPropagation();
    localStorage.setItem(DISMISS_KEY, 'true');
    button.remove();
  });
}

const beforeInstallPromptHandler = (event: Event): void => {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;

  updateEngagementData();
  startTimeTracking();

  setTimeout(() => {
    showInstallButton();
  }, 2000);
};

const beforeUnloadHandler = (): void => {
  saveTimeSpent();
};

const appInstalledHandler = (): void => {
  document.querySelector('#install-pwa-btn')?.remove();
  localStorage.removeItem(DISMISS_KEY);
};

if (installWindow.__pwaInstallButtonHandlers__) {
  const { appInstalled, beforeInstallPrompt, beforeUnload } =
    installWindow.__pwaInstallButtonHandlers__;
  globalThis.removeEventListener('beforeinstallprompt', beforeInstallPrompt);
  window.removeEventListener('beforeunload', beforeUnload);
  globalThis.removeEventListener('appinstalled', appInstalled);
}

window.addEventListener('beforeunload', beforeUnloadHandler);

globalThis.addEventListener('beforeinstallprompt', beforeInstallPromptHandler);

globalThis.addEventListener('appinstalled', appInstalledHandler);

installWindow.__pwaInstallButtonHandlers__ = {
  appInstalled: appInstalledHandler,
  beforeInstallPrompt: beforeInstallPromptHandler,
  beforeUnload: beforeUnloadHandler,
};

export type { BeforeInstallPromptEvent, EngagementData };
