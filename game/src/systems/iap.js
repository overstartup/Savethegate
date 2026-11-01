import { API_BASE_URL } from './backend.js';

// Store purchases via cordova-plugin-purchase (CdvPurchase): Google Play
// Billing on Android, StoreKit (App Store) on iOS. Every approved purchase
// is verified by our backend (/api/store/verify) before anything is
// granted; then the transaction is finished. Grants go through
// `iap.onGrant(productId, transactionId)` (set by main.js) — that also
// covers purchases approved later, e.g. one interrupted by an app restart.
//
// Local development (a localhost browser tab only): a test store approves
// purchases instantly so the whole buy flow can be tried. Never active in
// the app or on the live web build.

let store = null;
const waiting = new Map(); // productId → resolve(bool) of the buy() in progress

function settle(productId, ok) {
  const resolve = waiting.get(productId);
  if (resolve) { waiting.delete(productId); resolve(ok); }
}

export const iap = {
  enabled: false,
  testMode: false,
  onGrant: null, // (productId, transactionId) => void

  async init() {
    if (typeof window === 'undefined') return;
    // The app's WebView is served from "localhost" too (Capacitor), so the
    // test store also needs: no Capacitor at all, a dev-server port and
    // not an Android WebView. Inside the app, coins only ever come from
    // the real store — if it isn't ready, buying is simply unavailable.
    const inApp = !!window.Capacitor || /; wv\)/.test(navigator.userAgent || '');
    if (!inApp) {
      const devServer = ['localhost', '127.0.0.1'].includes(window.location.hostname)
        && window.location.protocol === 'http:' && window.location.port !== '';
      if (devServer) {
        this.enabled = true;
        this.testMode = true;
      }
      return; // a plain browser tab can't pay — purchases are app-only
    }
    if (!window.Capacitor?.isNativePlatform?.() || !window.CdvPurchase) {
      console.warn('[iap] store plugin missing — purchases unavailable');
      return;
    }

    try {
      const { Platform, ProductType } = window.CdvPurchase;
      store = window.CdvPurchase.store;
      const isIOS = window.Capacitor.getPlatform() === 'ios';
      const storePlatform = isIOS ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;

      // Product IDs must match Google Play Console and App Store Connect.
      store.register([
        // App Store: a one-time unlock must be a Non-Consumable to be restorable.
        { id: 'remove_ads', type: isIOS ? ProductType.NON_CONSUMABLE : ProductType.NON_RENEWING_SUBSCRIPTION, platform: storePlatform },
        { id: 'coins_small', type: ProductType.CONSUMABLE, platform: storePlatform },
        { id: 'coins_medium', type: ProductType.CONSUMABLE, platform: storePlatform },
        { id: 'coins_large', type: ProductType.CONSUMABLE, platform: storePlatform },
      ]);

      store.when().approved(async (transaction) => {
        const productId = transaction.products[0]?.id;
        try {
          // Google: the purchase token. Apple: the base64 app receipt, which
          // the backend checks with Apple.
          const token = isIOS
            ? transaction.parentReceipt?.nativeData?.appStoreReceipt
            : (transaction.purchaseId || transaction.products[0].transactionId || transaction.transactionId);
          const saveData = JSON.parse(localStorage.getItem('spellstorm-save-v1') || '{}');
          if (!saveData.playerId) {
            console.error('[iap] No playerId yet — the purchase stays pending until the next start.');
            settle(productId, false);
            return;
          }
          const response = await fetch(`${API_BASE_URL}/api/store/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              PlayerId: saveData.playerId,
              Platform: isIOS ? 'apple' : 'google',
              ProductId: productId,
              ReceiptToken: token,
              TransactionId: transaction.transactionId,
            }),
          });
          if (response.ok) {
            this.onGrant?.(productId, transaction.transactionId);
            await transaction.finish();
            settle(productId, true);
          } else if (response.status === 409) {
            // already paid out earlier (e.g. granted, then the app closed
            // before finishing) — finish it without paying twice
            await transaction.finish();
            settle(productId, false);
          } else {
            console.error('[iap] backend verification failed', await response.text());
            settle(productId, false);
          }
        } catch (err) {
          console.error('[iap] error verifying purchase', err);
          settle(productId, false);
        }
      });

      await store.initialize([storePlatform]);
      this.enabled = true;
    } catch (err) {
      console.warn('[iap] store init failed:', err);
    }
  },

  // The store's localized price ("€0,99"), or null before it's known.
  price(productId) {
    return store?.get(productId)?.pricing?.price || null;
  },

  // Opens the store's purchase sheet. Resolves true once the purchase was
  // verified and granted, false if it was cancelled or failed.
  async buy(productId) {
    if (!this.enabled) return false;
    if (this.testMode) {
      await new Promise((r) => setTimeout(r, 350));
      this.onGrant?.(productId, `test-${productId}-${Date.now()}`);
      return true;
    }
    const offer = store?.get(productId)?.getOffer();
    if (!offer) return false;
    return new Promise((resolve) => {
      waiting.set(productId, resolve);
      store.order(offer).then((err) => {
        if (err) settle(productId, false); // cancelled or failed in the store sheet
      });
      // the approved handler settles it; give up waiting after two minutes
      setTimeout(() => settle(productId, false), 120000);
    });
  },

  // Re-delivers owned non-consumables (remove_ads) through onGrant.
  async restore() {
    if (this.testMode) return true;
    if (!store) return false;
    await store.restorePurchases();
    return true;
  },
};
