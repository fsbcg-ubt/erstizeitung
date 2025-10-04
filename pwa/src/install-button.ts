// Custom interface for BeforeInstallPromptEvent (not in standard TypeScript lib)
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface IOSNavigator extends Navigator {
  standalone?: boolean;
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
const IOS_INSTRUCTIONS_DISMISSED_KEY = 'pwa-ios-instructions-dismissed';
const MIN_ENGAGEMENT_TIME = 30_000;
const MIN_VISITS = 2;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let trackingStartTime: number | null = null;

const installWindow = globalThis as InstallWindow;

/**
 * Detects if the PWA is already installed on the user's device.
 *
 * Checks both standard display-mode media query and iOS-specific
 * navigator.standalone property.
 *
 * @returns {boolean} True if app is installed and running in standalone mode
 */
function isAlreadyInstalled(): boolean {
  if (globalThis.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  if ((navigator as IOSNavigator).standalone === true) {
    return true;
  }

  return false;
}

/**
 * Detects if the browser is iOS Safari or macOS Safari.
 *
 * These browsers don't support the beforeinstallprompt event,
 * so we need to show manual installation instructions instead.
 *
 * @returns {boolean} True if iOS/Safari without beforeinstallprompt support
 */
function isIOSorSafari(): boolean {
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isSafari = /^(?:(?!chrome|android).)*safari/i.test(userAgent);

  const supportsBeforeInstallPrompt = 'BeforeInstallPromptEvent' in globalThis;

  return (isIOS || isSafari) && !supportsBeforeInstallPrompt;
}

/**
 * Displays installation instructions for iOS/Safari users.
 *
 * Shows a banner with manual "Add to Home Screen" instructions
 * since iOS doesn't support the beforeinstallprompt event.
 */
function showIOSInstallInstructions(): void {
  if (isAlreadyInstalled()) {
    return;
  }

  if (localStorage.getItem(IOS_INSTRUCTIONS_DISMISSED_KEY)) {
    return;
  }

  if (!shouldShowInstallPrompt()) {
    return;
  }

  const banner = document.createElement('div');
  banner.id = 'ios-install-banner';
  banner.className = 'ios-install-banner';
  banner.innerHTML = `
    <div class="ios-install-content">
      <span class="ios-install-icon">📱</span>
      <div class="ios-install-text">
        <strong>Als App installieren</strong>
        <p>Tippen Sie auf <span class="ios-share-icon">⎙</span> und dann auf "Zum Home-Bildschirm"</p>
      </div>
    </div>
    <button class="ios-install-dismiss" aria-label="Hinweis schließen">×</button>
  `;

  document.body.append(banner);

  const dismissButton = banner.querySelector('.ios-install-dismiss');
  const handleDismiss = (): void => {
    localStorage.setItem(IOS_INSTRUCTIONS_DISMISSED_KEY, 'true');
    banner.remove();
  };

  dismissButton?.addEventListener('click', handleDismiss);

  dismissButton?.addEventListener('keydown', (event: Event) => {
    const keyEvent = event as KeyboardEvent;
    if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
      keyEvent.preventDefault();
      handleDismiss();
    }
  });
}

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
  button.setAttribute('role', 'button');
  button.setAttribute(
    'aria-label',
    'Erstizeitung als Progressive Web App installieren',
  );
  button.setAttribute('tabindex', '0');
  button.innerHTML = `
    <span class="install-icon">📱</span>
    <span class="install-text">App installieren</span>
  `;
  document.body.append(button);

  setTimeout(() => {
    button.style.display = 'flex';
  }, 100);

  const handleInstallClick = (): void => {
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
  };

  button.addEventListener('click', handleInstallClick);

  button.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleInstallClick();
    }
  });

  const dismissButton = document.createElement('button');
  dismissButton.className = 'install-dismiss-btn';
  dismissButton.textContent = '×';
  dismissButton.setAttribute('role', 'button');
  dismissButton.setAttribute(
    'aria-label',
    'Installation-Hinweis dauerhaft schließen',
  );
  dismissButton.setAttribute('tabindex', '0');
  button.append(dismissButton);

  const handleDismissClick = (event: Event): void => {
    event.stopPropagation();
    localStorage.setItem(DISMISS_KEY, 'true');
    button.remove();
  };

  dismissButton.addEventListener('click', handleDismissClick);

  dismissButton.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDismissClick(event);
    }
  });
}

const beforeInstallPromptHandler = (event: Event): void => {
  if (isAlreadyInstalled()) {
    return;
  }

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

if (isAlreadyInstalled()) {
  document.querySelector('#install-pwa-btn')?.remove();
}

if (isIOSorSafari()) {
  updateEngagementData();
  startTimeTracking();

  // Wait 5 seconds before showing (allow user to orient themselves)
  setTimeout(() => {
    showIOSInstallInstructions();
  }, 5000);
}
