# GateWall — App Store Connect listing

Paste-ready text and answers for App Store Connect. Character limits are Apple's.

## New App form

| Field | Value |
|---|---|
| Platform | iOS |
| Name (≤30) | `GateWall` (fallback if taken: `GateWall: Guardian Defense`) |
| Primary language | English (U.S.) |
| Bundle ID | `com.turtoo.gatewall` |
| SKU | `gatewall-ios` |
| User access | Full Access |

## App Information

| Field | Value |
|---|---|
| Subtitle (≤30) | `Defend the gate. Level up.` |
| Category | Games → Action (secondary: Games → Arcade) |
| Content rights | Does not contain third-party content you don't have rights to |
| Privacy Policy URL | https://gatewall.turtoo.app/Privacy |
| Support URL | https://gatewall.turtoo.app/Legal |

## Version 1.1 page

**Promotional text (≤170)**
```
Fly the Guardian, blast monster waves and pick a new power every level. How long can you hold the GateWall?
```

**Description (≤4000)**
```
The monsters are coming, and only the Guardian stands between them and the GateWall.

Fly anywhere on the screen — your magic fires by itself. Dodge, weave and blast waves of creatures across floating islands, from the sunken Abyssal Rift to the frozen Glacial Peak, the desert Oasis Citadel and the Crystallized Forest.

LEVEL UP AS YOU FIGHT
Grab gems to level up mid-battle and choose a new power: Orbit Blades, Piercing Shards, Chain Lightning, Seeker Missiles and more. Every run plays differently.

CHAIN THE KILLS
Keep the combo going — chain 25 kills to trigger FEVER and tear through the horde.

CALL IN BACKUP
Spend coins on Bombs, Shields, Stone Walls, Cannons and Ward Sprites when a wave gets out of hand.

BUILD YOUR ARMORY
Upgrade the Guardian, Ward Sprite, Cannon, Stone Wall, Bomb and Shield between runs to push deeper into each stage.

CLIMB THE RANKS
Name your Guardian and compete on the Top Guardians leaderboard.

• One-finger controls — perfect for quick sessions
• Hand-painted worlds and boss fights
• Free to play; optional coin packs and Remove Ads
```

**Keywords (≤100, comma-separated, no spaces)**
```
shooter,defense,arcade,monster,guardian,wave,tower,roguelike,survival,shoot em up,magic,casual
```

**Screenshots (6.9" display, 1320×2868)** — upload in this order from
`store-assets/ios-screenshots/`:
1. `iphone_01_map.png`
2. `iphone_02_gameplay.png`
3. `iphone_03_levelup.png`
4. `iphone_05_combo.png`
5. `iphone_04_battle.png`
6. `iphone_06_armory.png`

App Store Connect scales these down for smaller iPhones automatically.
The app is iPhone-only, so no iPad screenshots are needed.

**Copyright:** `2026 overstartup GmbH`

**Version / Build:** 1.1 (2)

## Age rating questionnaire

| Question | Answer |
|---|---|
| Cartoon or fantasy violence | Infrequent/Mild |
| Everything else (realistic violence, horror, mature themes, gambling, etc.) | None |
| Unrestricted web access | No |
| User-generated content | No (player name on leaderboard only) |
| Contains advertising | Yes |
| In-app purchases | Yes |

Expected result: **9+**.

## App Privacy ("nutrition label")

Data collected — **used for third-party advertising** (AdMob) and **app functionality**:

| Data type | Linked to user | Used for tracking | Purposes |
|---|---|---|---|
| Identifiers → Device ID | No | Yes (only if the user taps Allow on the tracking prompt) | Third-Party Advertising |
| Usage Data → Advertising Data | No | Yes | Third-Party Advertising |
| Diagnostics → Crash Data | No | No | Third-Party Advertising (AdMob SDK) |
| Purchases → Purchase History | Yes | No | App Functionality |
| Identifiers → User ID (player ID) | Yes | No | App Functionality |
| User Content → Other (Guardian name on leaderboard) | Yes | No | App Functionality |

## In-App Purchases

Create under **Monetization → In-App Purchases**. IDs must match exactly.

| Product ID | Type | Reference name | Display name | Suggested price |
|---|---|---|---|---|
| `coins_small` | Consumable | Coins Pouch | Pouch — 100 coins | $0.99 |
| `coins_medium` | Consumable | Coins Chest | Chest — 550 coins | $3.99 |
| `coins_large` | Consumable | Coins Vault | Vault — 1400 coins | $7.99 |
| `remove_ads` | Non-Consumable | Remove Ads | Remove Ads | $2.99 |

Each IAP needs a review screenshot. Use a screenshot of the in-game
coin shop.

## App Review notes

```
GateWall is a single-player arcade shooter. No login is required.

Ads: Google AdMob banner (menus only), interstitial (after game over),
and an opt-in rewarded ad (FREE button) that grants coins.

In-app purchases: three consumable coin packs and a non-consumable
"Remove Ads". Open them by tapping the coin counter at the top-left of
the menu, or the + on any power-up button during play.
```
