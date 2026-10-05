import { API_BASE_URL } from './backend.js';

let storeReady = false;

// Direct store integration via cordova-plugin-purchase (CdvPurchase):
// Google Play Billing on Android, StoreKit (App Store) on iOS.
export const iap = {
  enabled: false,

  async init() {
    if (typeof window === 'undefined' || !window.CdvPurchase || !window.Capacitor?.isNativePlatform?.()) {
      return; // Web browser or plugin missing — purchases stay disabled
    }

    try {
      const { store, Platform, ProductType } = window.CdvPurchase;
      const isIOS = window.Capacitor.getPlatform() === 'ios';
      const storePlatform = isIOS ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;

      // Register all products. Product IDs must match exactly in both
      // Google Play Console and App Store Connect.
      store.register([
        // App Store: a one-time unlock must be a Non-Consumable to be restorable.
        { id: 'remove_ads', type: isIOS ? ProductType.NON_CONSUMABLE : ProductType.NON_RENEWING_SUBSCRIPTION, platform: storePlatform },
        { id: 'coins_small', type: ProductType.CONSUMABLE, platform: storePlatform },
        { id: 'coins_medium', type: ProductType.CONSUMABLE, platform: storePlatform },
        { id: 'coins_large', type: ProductType.CONSUMABLE, platform: storePlatform },
      ]);

      // When a purchase is approved by the store, verify it with our C# backend
      store.when().approved(async (transaction) => {
        try {
          // Google: the purchase token. Apple: the base64 app receipt, which
          // the backend posts to Apple's verifyReceipt endpoint.
          const token = isIOS
            ? transaction.parentReceipt?.nativeData?.appStoreReceipt
            : (transaction.products[0].transactionId || transaction.transactionId);
          const productId = transaction.products[0].id;
          
          // Get the playerId from localStorage (set by main.js / save.js)
          const saveData = JSON.parse(localStorage.getItem('spellstorm-save-v1') || '{}');
          if (!saveData.playerId) {
            console.error('[iap] No playerId found, cannot verify purchase.');
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
            // Verification succeeded! Tell the store to finalize the purchase
            transaction.verify();
            transaction.finish();
          } else {
            console.error('[iap] Backend verification failed', await response.text());
          }
        } catch (err) {
          console.error('[iap] Error verifying purchase', err);
        }
      });

      await store.initialize([storePlatform]);
      storeReady = true;
      this.enabled = true;
    } catch (err) {
      console.warn('[iap] store init failed:', err);
    }
  },

  // Requests the purchase overlay and waits for completion
  async buy(packId) {
    if (!storeReady) return false;
    try {
      const { store } = window.CdvPurchase;
      const product = store.get(packId);
      if (!product) return false;

      const offer = product.getOffer();
      if (!offer) return false;

      return new Promise(async (resolve) => {
        // We set up a one-time listener for this specific product's completion
        let resolved = false;

        const onApproved = store.when().productUpdated(product, (p) => {
          if (resolved) return;
          if (p.owned) {
            resolved = true;
            resolve(true); // purchase is fully verified and owned!
          }
        });

        // If the user cancels or the purchase fails
        const onError = store.when().receiptUpdated((receipt) => {
           // Basic error/cancel handling would go here in a robust app
        });

        // Start the native store purchase flow
        await store.order(offer);

        // Fallback timeout in case the overlay is closed without triggering events
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        }, 300000); // 5 minutes timeout
      });
    } catch (err) {
      console.warn('[iap] purchase flow failed:', err);
      return false;
    }
  }
};
