# iOS App — GateWall

`ios/` is the Capacitor iOS project. It wraps the same `www/index.html`
game bundle as the Android app, with the same AdMob ads and in-app
purchases (StoreKit instead of Google Play Billing).

## Requirements

- macOS with Xcode (built and tested with Xcode 26.6, iOS 26.5 simulator)
- CocoaPods (`brew install cocoapods`)
- Node 18+

## Day-to-day workflow

After any game code change:

```
cd game
node build-standalone.mjs
cp index.html ../app-native/www/index.html
cd ../app-native
LANG=en_US.UTF-8 npx cap sync ios
npx cap open ios
```

Then pick a simulator or your iPhone in Xcode and press Run ▶.

> `LANG=en_US.UTF-8` is needed because of a CocoaPods/Ruby bug: `pod install`
> crashes with `Unicode Normalization not appropriate for ASCII-8BIT`
> without it. You can add `export LANG=en_US.UTF-8` to `~/.zshrc` instead.

## What's configured

| Setting | Value |
|---|---|
| Bundle ID | `com.turtoo.gatewall` (same as Android) |
| Version | 1.1 (build 2) |
| Min iOS | 13.0 |
| Devices | iPhone only, portrait (runs on iPad in iPhone compatibility mode) |
| Status bar | Hidden |
| App icon / splash | Built from `graphics/logo_transparent.png` on the game's dark purple |
| AdMob App ID | Google's **test** iOS App ID (`Info.plist` → `GADApplicationIdentifier`) |
| Tracking prompt | App Tracking Transparency prompt shown once before ads start |
| SKAdNetwork IDs | Google's recommended list, in `Info.plist` |
| Export compliance | `ITSAppUsesNonExemptEncryption = NO` (HTTPS only) |

`ios/App/Podfile` pins `GoogleUserMessagingPlatform ~> 2.7`. The AdMob
plugin (6.x) uses the pre-3.0 consent API names and does not compile
against UMP 3.x. Remove the pin only after upgrading the AdMob plugin.

## Before publishing

### 1. Signing
In Xcode: **App target → Signing & Capabilities** → choose your Team.
Also add the **In-App Purchase** capability there.

### 2. AdMob (real ads)
1. In [apps.admob.com](https://apps.admob.com), add an **iOS** app. Copy its App ID.
2. Put it in `ios/App/App/Info.plist` → `GADApplicationIdentifier`.
3. The iOS ad unit IDs are already in `game/src/systems/ads.js` →
   `REAL_IDS.ios`. Set `USE_TEST_IDS = false` there (this switches Android too),
   then rebuild the bundle and run `cap sync ios`.

### 3. In-app purchases
1. In App Store Connect → your app → **Monetization → In-App Purchases**,
   create products with **exactly** these IDs (same as Google Play):
   - `coins_small`, `coins_medium`, `coins_large`: **Consumable**
   - `remove_ads`: **Non-Consumable**
2. Under **App Information → App-Specific Shared Secret**, generate a secret.
3. Set it on the backend as `Store:AppleSharedSecret` (and
   `Store:RequireRealVerification=true` once you're ready).
4. Test with a **Sandbox** account (Settings → App Store → Sandbox Account on the device).

The game sends the base64 App Store receipt to `/api/store/verify` with
`Platform: "apple"`. The backend validates it against Apple's
`verifyReceipt` endpoint and falls back to sandbox automatically.

### 4. App Store Connect listing
- **App Privacy**: declare *Identifiers → Device ID* (advertising) and
  *Usage Data → Advertising Data*, used for third-party advertising, and
  *Purchases*. The Google Mobile Ads SDK ships its own privacy manifest.
- Screenshots: use `store-assets/ios-screenshots/` (1320×2868, 6.9").
- All listing text, age rating, privacy answers and IAP definitions are in
  [APP_STORE_LISTING.md](APP_STORE_LISTING.md).

### 5. Archive & upload
In Xcode: select **Any iOS Device (arm64)** → **Product → Archive** →
**Distribute App → App Store Connect**.
