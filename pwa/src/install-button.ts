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
const DISMISS_COOLDOWN_DAYS = 14;
const RE_PROMPT_VISIT_THRESHOLD = 10;
const MAX_DISMISS_COUNT = 3;
const RESET_CYCLE_DAYS = 90;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let trackingStartTime: number | null = null;
let iosInstructionsShownThisSession = false;

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
 * Gets iOS banner dismiss data from localStorage with migration support.
 *
 * Handles migration from old boolean format ('true') to new structured format.
 * Also handles edge case where engagement data was cleared but dismiss data wasn't.
 *
 * @returns {DismissData | null} Dismiss data or null if never dismissed
 */
function getIOSDismissData(): DismissData | null {
  const raw = localStorage.getItem(IOS_INSTRUCTIONS_DISMISSED_KEY);
  if (!raw) {
    return null;
  }

  // Migration: Old boolean format
  if (raw === 'true') {
    const now = Date.now();
    const migratedData: DismissData = {
      dismissCount: 1,
      dismissedAt: now - 14 * 24 * 60 * 60 * 1000, // Assume dismissed 14 days ago
      firstDismissedAt: now - 14 * 24 * 60 * 60 * 1000,
      visitCountAtDismiss: getEngagementData().visitCount,
    };
    saveIOSDismissData(migratedData);
    return migratedData;
  }

  try {
    const parsed = JSON.parse(raw) as DismissData;
    const engagementData = getEngagementData();

    // Reset if engagement was cleared (visit count < stored baseline)
    if (engagementData.visitCount < parsed.visitCountAtDismiss) {
      localStorage.removeItem(IOS_INSTRUCTIONS_DISMISSED_KEY);
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem(IOS_INSTRUCTIONS_DISMISSED_KEY);
    return null;
  }
}

/**
 * Saves iOS banner dismiss data to localStorage.
 *
 * @param {DismissData} data - Dismiss data to save
 */
function saveIOSDismissData(data: DismissData): void {
  try {
    localStorage.setItem(IOS_INSTRUCTIONS_DISMISSED_KEY, JSON.stringify(data));
  } catch (error) {
    // Storage full → fail silently (banner shows again next visit, acceptable UX)
    console.warn('Failed to save iOS dismiss state:', error);
  }
}

/**
 * Checks if iOS install banner should be re-prompted after dismissal.
 *
 * Re-prompts if:
 * - 14+ days passed since last dismiss, OR
 * - 10+ visits occurred since dismiss
 * - AND dismissCount < 3 (max dismissals)
 *
 * @returns {boolean} True if banner should show again
 */
function shouldRepromptIOSBanner(): boolean {
  const dismissData = getIOSDismissData();
  if (!dismissData) {
    return true;
  }

  if (dismissData.dismissCount >= MAX_DISMISS_COUNT) {
    return false;
  }

  const engagementData = getEngagementData();
  const now = Date.now();

  // Calculate days since last dismiss (clamped to 0 for time manipulation edge case)
  const daysSinceDismiss = Math.max(
    0,
    (now - dismissData.dismissedAt) / (1000 * 60 * 60 * 24),
  );

  // Calculate visits since dismiss (using visitCount - 1 to account for current visit increment)
  const visitsSinceDismiss =
    engagementData.visitCount - 1 - dismissData.visitCountAtDismiss;

  return (
    daysSinceDismiss >= DISMISS_COOLDOWN_DAYS ||
    visitsSinceDismiss >= RE_PROMPT_VISIT_THRESHOLD
  );
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

  if (iosInstructionsShownThisSession) {
    return;
  }

  if (!shouldShowInstallPrompt()) {
    return;
  }

  if (!shouldRepromptIOSBanner()) {
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
        <p>Tippe auf das Teilen-Symbol und dann auf "Zum Home-Bildschirm"</p>
      </div>
    </div>
    <button class="ios-install-dismiss" aria-label="Hinweis schließen">×</button>
  `;

  document.body.append(banner);
  iosInstructionsShownThisSession = true;

  const dismissButton = banner.querySelector('.ios-install-dismiss');
  const handleDismiss = (): void => {
    const currentData = getIOSDismissData();
    const engagementData = getEngagementData();
    const now = Date.now();

    let dismissCount = (currentData?.dismissCount ?? 0) + 1;
    let firstDismissedAt = currentData?.firstDismissedAt ?? now;

    // Reset dismissCount if 90 days passed since first dismiss
    if (currentData?.firstDismissedAt) {
      const daysSinceFirst =
        (now - currentData.firstDismissedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceFirst >= RESET_CYCLE_DAYS) {
        dismissCount = 1;
        firstDismissedAt = now;
      }
    }

    const dismissData: DismissData = {
      dismissCount,
      dismissedAt: now,
      firstDismissedAt,
      visitCountAtDismiss: engagementData.visitCount - 1,
    };

    saveIOSDismissData(dismissData);
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

interface DismissData {
  dismissCount: number;
  dismissedAt: number;
  firstDismissedAt: number;
  visitCountAtDismiss: number;
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
