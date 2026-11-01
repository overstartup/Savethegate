# Coin Shop / In-App Purchases — GateWall

Real purchases work inside the native app (Android / iOS). In a plain
browser tab the shop is visible but buying is off — except on the local dev
server (`http://localhost:<port>`, outside the app), where a **test store**
approves purchases instantly and says "TEST PURCHASE" so the whole flow can
be tried during development (`game/src/systems/iap.js`, `testMode`). Inside
the app (Capacitor) the test store never runs: coins only come from Google
Play / the App Store, and if the store isn't ready buying is unavailable.

## How purchases work

1. The game opens the store sheet with `cordova-plugin-purchase`
   (Google Play Billing / StoreKit).
2. When the store approves, the game sends the receipt to our backend
   (`POST /api/store/verify`, `backend/src/GateWall.Admin/Program.cs`).
3. The backend checks it with Google / Apple (`Store:RequireRealVerification`
   must stay `true` in production), records the transaction so it can only
   pay once, and answers `200`. A repeated transaction answers `409`.
4. On `200` the game grants the purchase (`iap.onGrant` in `main.js`) and
   finishes the transaction; on `409` it finishes it without paying again.
   The game also remembers granted transaction ids (`saveData.iapTx`).
5. **Restore Purchases** (Settings) re-delivers `remove_ads` on a new device.

## Products (IDs must match Play Console and App Store Connect)

| Product        | Type                          | Coins | Price label |
|----------------|-------------------------------|-------|-------------|
| `coins_small`  | consumable                    | 4,000  | $3.99       |
| `coins_medium` | consumable (POPULAR badge)    | 9,000  | $7.99       |
| `coins_large`  | consumable (BEST VALUE badge) | 20,000 | $15.99      |
| `remove_ads`   | non-consumable (iOS) / one-time (Android) | — | set in store |

The coin amounts live in two places that must agree:
`game/src/data/shop.js` (`COIN_PACKS`) and the backend config
`Store:CoinPacks` in `appsettings.json`. The price label in `shop.js` is only
a fallback; the shop shows the store's localized price once it's loaded.

## The coin economy (all numbers in `CONFIG.economy`, `game/src/config.js`)

One scale for everything: **10 coins = 1 cent** ($3.99 = 4,000 coins).

Earned in play (a level takes ~1.5-2 minutes):
- Clearing a level: 30 + 5 per level in the stage + 25 per stage (stage 1: 35-80).
- 25% of kills drop 2-3 coins; a boss pays 100 + 50 per stage.
- About 1,000 coins (~$1) over stage 1, more in later stages.

Free rewards (REWARDS tab):
- 7-day login streak: 100, 150, 200, 250, 300, 400, 800.
- Free gift every 4 hours: 60. Rewarded videos: 30, 40, 50, 60, 80 coins
  (each video today pays the next step; 5 per day, 260 in all).
- 3 daily missions: 80-150 coins each.
- Invite a friend: the friend gets 500 at once, you get 1,000 per friend
  (backend `/api/invite/*`, config `Invite:*`; max 30 friends per code).

Spent on:
- Revives: about one level's coins: 100 + 25 per stage, doubling for each
  revive in a run (stage 1: 100 / 200 / 400), max 3; or one free video revive.
- Helpers in a run: 40-90 coins (about half a level).
- Armory upgrades (`game/src/data/upgrades.js`): 1.5 x base x (1 + 0.35 x level)^2.

Old saves are converted once (`econ: 2` in the save): coins x1.5, so
savings keep the same buying power under the new prices.

## Store setup checklist

1. **Google Play Console** → Monetize → Products → In-app products: create
   `coins_small`, `coins_medium`, `coins_large` (managed) and `remove_ads`.
2. **App Store Connect** → In-App Purchases: the three coin packs as
   Consumable, `remove_ads` as Non-Consumable.
3. **Backend config** (Coolify environment): `Store:AppleSharedSecret`,
   `Store:GooglePlay:PackageName`, `ServiceAccountEmail`, `PrivateKey`.
4. Rebuild the game and copy it into the app:
   ```
   cd game
   node build-standalone.mjs
   cp index.html ../app-native/www/index.html
   npx cap sync
   ```
5. Test with a Play Console **license tester** / App Store **sandbox** account
   so purchases don't charge real money.
