# Debug and Run implementation plan

The goal is to resolve existing build issues and potential runtime bugs to allow the app to be run on an Android device or emulator.

## User Review Required

> [!IMPORTANT]
> A persistent Gradle build error (`AndroidLocationsBuildService`) was encountered in the current shell environment. This appears to be related to environment restrictions (likely missing or non-writable home directories for the Android SDK configuration).
>
> **You should be able to run the app normally using the Play button in Android Studio**, as the IDE handles these environment variables differently than the raw shell.

## Proposed Changes

### Build Configuration

#### [MODIFY] [gradle.properties](file:///C:/ov371/prj/Game/Save%20the%20gate/app-native/android/gradle.properties)
- Added `org.gradle.java.home` pointing to the Android Studio JBR to resolve Java version mismatches during CLI builds.

#### [NEW] [local.properties](file:///C:/ov371/prj/Game/Save%20the%20gate/app-native/android/local.properties)
- Created to explicitly define `sdk.dir`, ensuring Gradle can find the Android SDK.

---

### Game Logic & Backend Connectivity

#### [MODIFY] [backend.js](file:///C:/ov371/prj/Game/Save%20the%20gate/game/src/systems/backend.js)
- Updated `API_BASE_URL` to automatically switch to `10.0.2.2` when running on the Android native platform. This allows the emulator to communicate with a backend running on the host machine's `localhost`.

#### [MODIFY] [iap.js](file:///C:/ov371/prj/Game/Save%20the%20gate/game/src/systems/iap.js)
- Fixed a bug where the IAP verification logic was looking for the wrong `localStorage` key (`crystalgate-save` instead of `spellstorm-save-v1`). This would have caused purchase verification to fail due to a missing `playerId`.

---

### Distribution

#### [MODIFY] [index.html](file:///C:/ov371/prj/Game/Save%20the%20gate/app-native/www/index.html)
- Regenerated the bundled game HTML with the above fixes.
- Synced the new bundle to the Android assets directory (`android/app/src/main/assets/public/`).

## Verification Plan

### Automated Tests
- None available for this web-based game at the current level.

### Manual Verification
1. Open the project in **Android Studio**.
2. Perform a **Gradle Sync**.
3. Select an emulator (e.g., `medium_phone`) and click **Run**.
4. Verify the following:
    - The game loads and plays.
    - Leaderboard/Backend calls don't fail with connection errors (if a backend is running at port 5041).
    - AdMob test ads appear (test IDs are currently active).
    - In-App Purchase buttons (if reachable) attempt to open the Google Play billing overlay.
