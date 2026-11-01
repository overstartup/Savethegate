// ============================================================
// AdMob integration — works ONLY when running inside the native
// Capacitor app (Android/iOS). Inside a plain browser tab every
// function below becomes a harmless no-op, so the game (index.html,
// play.html) keeps working exactly as before with zero ads.
//
// Uses Google's OFFICIAL TEST ad unit IDs below. Swap them for your
// real AdMob IDs before publishing — see shootingstart/app-native/ADMOB_SETUP.md.
// ============================================================
import { CONFIG } from '../config.js';

// Google's public TEST ad unit IDs — always safe to ship while testing,
// never earn real money, never risk an AdMob policy violation.
const TEST_IDS = {
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
  },
};

// TODO: replace with your real AdMob ad unit IDs before release.
// Get them from https://apps.admob.com → Apps → Ad units.
const REAL_IDS = {
  android: {
    banner: 'ca-app-pub-3298222007921646/5882325137',
    interstitial: 'ca-app-pub-3298222007921646/3998397821',
    rewarded: 'ca-app-pub-3298222007921646/1943080125',
  },
  ios: {
    banner: 'ca-app-pub-3298222007921646/8316650851',
    interstitial: 'ca-app-pub-3298222007921646/1808037113',
    rewarded: 'ca-app-pub-3298222007921646/6868792105',
  },
};

// Flip to false once you've filled in REAL_IDS with a real AdMob account's
// ad unit IDs and are ready to publish. Test IDs always serve a sample ad
// and never earn money, so there's zero risk of an AdMob policy violation
// while you're just trying things out.
const USE_TEST_IDS = false; // live AdMob ads (GateWall app ids are in AndroidManifest.xml / Info.plist)

let AdMob = null;
let BannerAdPosition = null;
let BannerAdSize = null;
let platform = 'android';
let ready = false;
let interstitialLoaded = false;
let rewardedLoaded = false;
let removed = false; // "Remove Ads" IAP purchased — banners/interstitials stay off.
                      // Rewarded (opt-in, watch-for-coins) ads are untouched by this.

function ids() {
  const table = USE_TEST_IDS ? TEST_IDS : REAL_IDS;
  return table[platform] || table.android;
}

// --- Public API ----------------------------------------------------
// Every function below is safe to call even before init() resolves,
// and safe to call in a plain browser (all become no-ops).

export const ads = {
  enabled: false,
  // Local dev server only (never in the app): a pretend rewarded video that
  // "plays" for a moment and pays out, so revive / free-coin flows can be
  // tried in a browser. Same rule as the test store in systems/iap.js.
  testMode: false,

  async init() {
    // Capacitor injects window.Capacitor only inside the native app shell.
    if (typeof window === 'undefined' || !window.Capacitor?.isNativePlatform?.()) {
      const inApp = typeof window !== 'undefined' && (!!window.Capacitor || /; wv\)/.test(navigator.userAgent || ''));
      this.testMode = !inApp && ['localhost', '127.0.0.1'].includes(window.location?.hostname)
        && window.location.protocol === 'http:' && window.location.port !== '';
      return; // running in a normal browser tab — ads stay disabled
    }
    try {
      // The game ships as one inlined HTML file with no bundler, so a bare
      // `import('@capacitor-community/admob')` can't resolve inside the
      // WebView. Capacitor registers every native plugin on
      // window.Capacitor.Plugins, so use that. The enum values are plain strings.
      AdMob = window.Capacitor.Plugins?.AdMob;
      if (!AdMob) throw new Error('AdMob plugin not registered');
      BannerAdPosition = { BOTTOM_CENTER: 'BOTTOM_CENTER' };
      BannerAdSize = { ADAPTIVE_BANNER: 'ADAPTIVE_BANNER' };
      platform = window.Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';

      // iOS 14+: ask for App Tracking Transparency before the first ad
      // request (App Store requirement when ads use the IDFA). Declining
      // still serves ads, just non-personalized ones.
      if (platform === 'ios') {
        try {
          const { status } = await AdMob.trackingAuthorizationStatus();
          if (status === 'notDetermined') await AdMob.requestTrackingAuthorization();
        } catch { /* older plugin / iOS — ignore */ }
      }

      await AdMob.initialize({
        testingDevices: [],
        initializeForTesting: USE_TEST_IDS,
      });
      ready = true;
      this.enabled = true;
      this._preloadInterstitial();
      this._preloadRewarded();
    } catch (err) {
      console.warn('[ads] AdMob not available, continuing without ads:', err);
    }
  },

  setRemoved(v) { removed = !!v; },

  async showBanner() {
    if (!ready || removed) return;
    try {
      await AdMob.showBanner({
        adId: ids().banner,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
      });
    } catch (err) { console.warn('[ads] banner failed:', err); }
  },

  async hideBanner() {
    if (!ready) return;
    try { await AdMob.hideBanner(); } catch { /* ignore */ }
  },

  async _preloadInterstitial() {
    if (!ready) return;
    try {
      await AdMob.prepareInterstitial({ adId: ids().interstitial });
      interstitialLoaded = true;
    } catch (err) { console.warn('[ads] interstitial preload failed:', err); }
  },

  // Shows a full-screen ad if one is ready; always resolves (never blocks the game).
  async showInterstitial() {
    if (!ready || !interstitialLoaded || removed) return;
    try {
      interstitialLoaded = false;
      await AdMob.showInterstitial();
    } catch (err) {
      console.warn('[ads] interstitial show failed:', err);
    } finally {
      this._preloadInterstitial(); // load the next one immediately
    }
  },

  async _preloadRewarded() {
    if (!ready) return;
    try {
      await AdMob.prepareRewardVideoAd({ adId: ids().rewarded });
      rewardedLoaded = true;
    } catch (err) { console.warn('[ads] rewarded preload failed:', err); }
  },

  // onReward is called ONLY if the player watched the full ad. One video at
  // a time: extra taps while one is opening/playing are ignored, so a
  // double tap can't pay out twice.
  async showRewarded(onReward, onUnavailable) {
    if (this.playing) return;
    if (this.testMode) {
      this.playing = true;
      setTimeout(() => { this.playing = false; onReward(); }, 700);
      return;
    }
    if (!ready || !rewardedLoaded) { onUnavailable?.(); return; }
    this.playing = true;
    try {
      rewardedLoaded = false;
      let listener = null;
      listener = AdMob.addListener('onRewardedVideoAdReward', () => {
        onReward();
        listener?.remove();
      });
      await AdMob.showRewardVideoAd();
    } catch (err) {
      console.warn('[ads] rewarded show failed:', err);
      onUnavailable?.();
    } finally {
      this.playing = false;
      this._preloadRewarded();
    }
  },

  isRewardedReady() { return this.testMode || (ready && rewardedLoaded); },
};
