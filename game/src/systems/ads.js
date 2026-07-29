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
    banner: 'YOUR-ANDROID-BANNER-AD-UNIT-ID',
    interstitial: 'YOUR-ANDROID-INTERSTITIAL-AD-UNIT-ID',
    rewarded: 'YOUR-ANDROID-REWARDED-AD-UNIT-ID',
  },
  ios: {
    banner: 'YOUR-IOS-BANNER-AD-UNIT-ID',
    interstitial: 'YOUR-IOS-INTERSTITIAL-AD-UNIT-ID',
    rewarded: 'YOUR-IOS-REWARDED-AD-UNIT-ID',
  },
};

// Flip to false once you've filled in REAL_IDS and are ready to publish.
const USE_TEST_IDS = true;

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

  async init() {
    // Capacitor injects window.Capacitor only inside the native app shell.
    if (typeof window === 'undefined' || !window.Capacitor?.isNativePlatform?.()) {
      return; // running in a normal browser tab — ads stay disabled
    }
    try {
      const core = await import('@capacitor-community/admob');
      AdMob = core.AdMob;
      BannerAdPosition = core.BannerAdPosition;
      BannerAdSize = core.BannerAdSize;
      platform = window.Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';

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
        position: BannerAdPosition.TOP_CENTER,
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

  // onReward is called ONLY if the player watched the full ad.
  async showRewarded(onReward, onUnavailable) {
    if (!ready || !rewardedLoaded) { onUnavailable?.(); return; }
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
      this._preloadRewarded();
    }
  },

  isRewardedReady() { return ready && rewardedLoaded; },
};
