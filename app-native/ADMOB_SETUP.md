# AdMob Setup — Landgate (native app)

This folder (`shootingstart/app-native/`) is a Capacitor Android project that
wraps the game (`shootingstart/game/`) so it can run as a real app and show
AdMob ads. **AdMob only works here — not in the plain browser version.**

## What's already wired up

- `www/index.html` — the game, bundled with everything inlined (same file as
  `shootingstart/game/index.html`; re-copy it here after any game code change).
- `src/systems/ads.js` (inside the game bundle) — a thin wrapper around
  `@capacitor-community/admob` that:
  - does nothing (safely) when opened in a normal browser
  - shows a **banner** at the **bottom** of the screen on every non-gameplay
    screen (menu, shop, leaderboard, upgrades, settings, pause, game over,
    victory, level clear) — and hides it during active PLAYING, so it never
    sits near the buy-button row or the Guardian's own movement space.
    A single `syncBanner()` helper in `main.js` is called right after every
    mode change, so this can't drift out of sync screen-by-screen.
  - shows a **full-screen interstitial** after Game Over, on Victory, and
    every `CONFIG.ads.interstitialEveryNLevels` levels cleared (default: 2)
    — the bottom banner is already back in place for that screen underneath,
    so it's there the moment the interstitial dismisses
  - shows a **rewarded ad** button (bottom-center, labeled "FREE") during
    gameplay that grants `CONFIG.ads.rewardedCoins` coins (default: 50) for
    watching
- `android/app/src/main/AndroidManifest.xml` — has the AdMob App ID meta-data
  tag required by the SDK.
- Everything currently uses **Google's official TEST ad unit IDs**. These are
  100% safe to build and run — they always serve a sample ad and never earn
  real money, so there's no risk of an AdMob account violation while testing.

## Before you publish: swap in your real IDs

1. Create an AdMob account at [apps.admob.com](https://apps.admob.com) and
   add your app (Android). AdMob gives you an **App ID** like
   `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`.
2. Create three **ad units** under that app: Banner, Interstitial, Rewarded.
   Each gives you an ID like `ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`.
3. Open `shootingstart/game/src/systems/ads.js`:
   - Fill in `REAL_IDS.android.banner / interstitial / rewarded` with your
     three ad unit IDs.
   - Set `USE_TEST_IDS = false`.
4. Open `android/app/src/main/AndroidManifest.xml` and replace the test
   App ID in the `com.google.android.gms.ads.APPLICATION_ID` meta-data value
   with your real App ID.
5. Rebuild the game bundle and copy it into the native app:
   ```
   cd shootingstart/game
   node build-standalone.mjs
   cp index.html ../app-native/www/index.html
   ```

## Building & running the app

This project's `android/` folder was generated for you, but actually
compiling and running an Android app needs Android Studio and the Android
SDK on your own machine (you already have Android Studio installed).

1. Open a terminal in `shootingstart/app-native/`.
2. Run `npx cap open android` — this opens the project in Android Studio.
   (First launch: let Android Studio finish "Gradle Sync" — it downloads
   the Android build tools and dependencies, which needs internet and can
   take several minutes the first time.)
3. Plug in an Android phone (with USB debugging enabled) or start an
   emulator, then click the Run ▶ button in Android Studio.
4. You should see the game with a banner ad at the top. Play until Game
   Over to see the interstitial. Tap the "FREE" button to test the
   rewarded ad.

## Publishing checklist (when ready)

- Swap test IDs → real IDs (see above) and set `USE_TEST_IDS = false`.
- Update `app/build.gradle` → bump `versionCode` / `versionName` for updates.
- Replace the default app icon (`android/app/src/main/res/mipmap-*/`) with
  your own artwork.
- In Android Studio: **Build → Generate Signed Bundle/APK** to create the
  release `.aab` file for the Google Play Console.
- In the Play Console, fill out the required Ads declaration (yes, this app
  shows ads) and Data Safety section (AdMob collects an advertising ID).

## Known limitation of this setup

One leftover unused template file exists at
`android/app/src/main/java/com/getcapacitor/myapp/MainActivity.java` from the
initial project scaffold — it's dead code in an unused package and is not
referenced anywhere, so it doesn't affect the build, but feel free to delete
it yourself in Android Studio if you want a fully clean tree.
