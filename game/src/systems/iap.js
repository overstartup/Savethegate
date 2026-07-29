// ============================================================
// In-app purchases (real money → coins). Same pattern as src/systems/ads.js:
// works ONLY inside the native Capacitor app. In a plain browser tab every
// function below is a safe no-op, and the shop UI shows "app only" instead
// of a buy button so nothing looks broken or clickable-but-dead.
//
// Wire-up target: @revenuecat/purchases-capacitor (handles both Google Play
// Billing and App Store StoreKit behind one API). See
// shootingstart/app-native/IAP_SETUP.md for the real setup steps —
// installing and configuring a billing SDK requires your own Play Console /
// App Store Connect + RevenueCat account, which can't be done from here.
// ============================================================
let Purchases = null;
let iapReady = false;

export const iap = {
  enabled: false,

  async init() {
    if (typeof window === 'undefined' || !window.Capacitor?.isNativePlatform?.()) {
      return; // plain browser — purchases stay disabled
    }
    try {
      const core = await import('@revenuecat/purchases-capacitor');
      Purchases = core.Purchases;
      // TODO: replace with your real RevenueCat public API key.
      await Purchases.configure({ apiKey: 'YOUR-REVENUECAT-PUBLIC-SDK-KEY' });
      iapReady = true;
      this.enabled = true;
    } catch (err) {
      console.warn('[iap] purchases unavailable, coin shop will be app-only:', err);
    }
  },

  // Returns true if this pack was actually purchased and coins should be granted.
  async buy(packId) {
    if (!iapReady) return false;
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings?.current?.availablePackages?.find(
        (p) => p.identifier === packId || p.product?.identifier === packId
      );
      if (!pkg) return false;
      const result = await Purchases.purchasePackage({ aPackage: pkg });
      return !!result?.customerInfo; // purchase completed
    } catch (err) {
      console.warn('[iap] purchase failed or cancelled:', err);
      return false;
    }
  },
};
