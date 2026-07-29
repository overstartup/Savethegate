# Coin Shop / In-App Purchases — Landgate

Like AdMob (see `ADMOB_SETUP.md`), real purchases only work inside the
native app — the browser version shows the shop UI but every "buy" button
is inert and displays "Purchases available in the app version".

## How the coin economy works now

Coins are intentionally scarce so BOMB (30) and ANGEL (60) feel like real
choices, not something you casually spam:

- Only **35%** of kills drop 1–2 coins (`CONFIG.economy.coinDropChance` /
  `coinDropAmount` in `game/src/config.js`). Bosses always drop a bigger sum.
- Clearing a level pays a small flat bonus (`CONFIG.economy.levelClearBonus`,
  default 4) — not scaled by level number anymore.
- The free rewarded ad grants 25 coins (`CONFIG.ads.rewardedCoins`).
- Everything else comes from the **coin shop** (tap the coin counter,
  top-left) — three packs defined in `game/src/data/shop.js`:
  Pouch (100 coins), Chest (550 coins, marked best value), Vault (1400 coins).

Tune all of this by editing those two files — no other code changes needed
for balance passes.

## Wiring up real purchases

This project uses [RevenueCat](https://www.revenuecat.com/) via
`@revenuecat/purchases-capacitor`, which sits on top of Google Play Billing
(and App Store StoreKit if you ever add iOS) behind one simple API — much
less native code than talking to Play Billing directly.

1. **Google Play Console**: create the app, then under
   Monetize → Products → In-app products, create three managed products
   with IDs matching `game/src/data/shop.js`: `coins_small`, `coins_medium`,
   `coins_large`. Set your own prices (the `$0.99` / `$3.99` / `$7.99` in
   `shop.js` are just display labels for now — the real price shown to
   users comes from what you configure in Play Console).
2. **RevenueCat**: create a free account at [app.revenuecat.com](https://app.revenuecat.com),
   add your Android app, connect it to your Play Console app, and create an
   "Offering" containing packages that map to the three product IDs above.
   RevenueCat gives you a **Public SDK Key**.
3. In `shootingstart/app-native`, install the plugin:
   ```
   npm install @revenuecat/purchases-capacitor
   npx cap sync android
   ```
4. Open `shootingstart/game/src/systems/iap.js` and replace
   `'YOUR-REVENUECAT-PUBLIC-SDK-KEY'` with your real public key.
5. Rebuild and copy into the native app (same as after any game change):
   ```
   cd shootingstart/game
   node build-standalone.mjs
   cp index.html ../app-native/www/index.html
   ```
6. `npx cap open android` → Run. Use a Play Console **license tester**
   account on the test device so purchases don't charge real money while
   you verify the flow.

## What's already built and works today (no setup needed)

- The full shop dialog UI (3 packages, best-value badge, prices, close
  button) — visible and browsable in the plain browser right now.
- The economy rebalance (scarce coins) — active everywhere immediately.
- The "buy vs. locked" indicator on the BOMB/ANGEL buttons: a green check
  badge when you can afford it, a red "+" badge when you can't — tapping an
  unaffordable button automatically opens the coin shop.
- Safe no-op purchase flow: tapping a pack without RevenueCat configured
  never grants fake coins, it just plays a "denied" sound.
