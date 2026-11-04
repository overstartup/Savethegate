with open('game/src/main.js', 'r', encoding='utf-8') as f:
    main = f.read()

# 1. Add STAGE_PICK_BUTTONS, PAUSE_STAGE_BUTTONS to screens.js import
old_import = "import { renderMenu, renderLevelClear, LC_TIMES, renderVictory, renderGameOver, GAMEOVER_BUTTONS, renderRewards, REWARDS_BUTTONS, navHit, setNavBadges, drawBottomNav, renderShop, SHOP_BUTTONS, MENU_BUTTONS, END_MENU_BUTTON, renderUpgrades, UPGRADE_BUTTONS, unitDialog, unitDialogRows, renderLeaderboard, LEADERBOARD_BUTTONS, renderSettings, SETTINGS_BUTTONS, PRIVACY_URL, homeLayout, homePlayRect, CONTINUE_CLOSE_BUTTON, CONTINUE_CARD_RECT, CONTINUE_PLAY_BUTTON, envIcon, renderPause, PAUSE_BUTTONS, renderPlacementBanner, PLACEMENT_CONTINUE_BUTTON, BG_IMAGES, KENNEY_SEA, KENNEY_PIRATE, KENNEY_CASTLE, DESERT_PLANTS, ICE_GLACIAL, BAT_FRAMES, BAT_FRAME_COUNT, ENEMY_SPRITES, ANIM_FRAMES } from './ui/screens.js';"
new_import = "import { renderMenu, renderLevelClear, LC_TIMES, renderVictory, renderGameOver, GAMEOVER_BUTTONS, renderRewards, REWARDS_BUTTONS, navHit, setNavBadges, drawBottomNav, renderShop, SHOP_BUTTONS, MENU_BUTTONS, END_MENU_BUTTON, renderUpgrades, UPGRADE_BUTTONS, unitDialog, unitDialogRows, renderLeaderboard, LEADERBOARD_BUTTONS, renderSettings, SETTINGS_BUTTONS, PRIVACY_URL, homeLayout, homePlayRect, CONTINUE_CLOSE_BUTTON, CONTINUE_CARD_RECT, CONTINUE_PLAY_BUTTON, envIcon, renderPause, PAUSE_BUTTONS, renderPlacementBanner, PLACEMENT_CONTINUE_BUTTON, BG_IMAGES, KENNEY_SEA, KENNEY_PIRATE, KENNEY_CASTLE, DESERT_PLANTS, ICE_GLACIAL, BAT_FRAMES, BAT_FRAME_COUNT, ENEMY_SPRITES, ANIM_FRAMES, STAGE_PICK_BUTTONS, PAUSE_STAGE_BUTTONS } from './ui/screens.js';"

if old_import in main:
    main = main.replace(old_import, new_import)
else:
    print("WARNING: screens.js import not matched exactly")

# 2. Update continueDismissed definition
old_cd = "let continueDismissed = (saveData.progress?.levelIndex || 0) > 0 || (saveData.best || 0) > 0;"
new_cd = "let continueDismissed = CONFIG.devUnlockAllStages || (saveData.progress?.levelIndex || 0) > 0 || (saveData.best || 0) > 0;"
main = main.replace(old_cd, new_cd)

# 3. Update tuStartFirstRun
old_tu = """function tuStartFirstRun() {
  if (renaming || mode !== 'MENU' || !tuIsNewPlayer(saveData)) return;
  continueDismissed = true;
  newGame(0);
  mode = 'PLAYING';
  syncBanner();
}"""

new_tu = """function tuStartFirstRun() {
  if (CONFIG.devUnlockAllStages) {
    continueDismissed = true;
    return;
  }
  if (renaming || mode !== 'MENU' || !tuIsNewPlayer(saveData)) return;
  continueDismissed = true;
  newGame(0);
  mode = 'PLAYING';
  syncBanner();
}"""

if old_tu in main:
    main = main.replace(old_tu, new_tu)
else:
    main = main.replace(old_tu.replace('\n', '\r\n'), new_tu.replace('\n', '\r\n'))

# 4. Handle PAUSE_STAGE_BUTTONS in onTap
old_pause_tap = """  if (mode === 'PAUSED') {
    if (hit(PAUSE_BUTTONS.resume, x, y)) { mode = 'PLAYING'; syncBanner(); return; }
    if (hit(PAUSE_BUTTONS.exit, x, y)) { mode = 'MENU'; syncBanner(); return; } // abandon the run, no score submitted
    return;
  }"""

new_pause_tap = """  if (mode === 'PAUSED') {
    if (hit(PAUSE_BUTTONS.resume, x, y)) { mode = 'PLAYING'; syncBanner(); return; }
    if (hit(PAUSE_BUTTONS.exit, x, y)) { mode = 'MENU'; syncBanner(); return; } // abandon the run, no score submitted
    for (const b of PAUSE_STAGE_BUTTONS) {
      if (hit(b, x, y)) {
        audio.pick();
        newGame(b.level);
        mode = 'PLAYING';
        syncBanner();
        return;
      }
    }
    return;
  }"""

if old_pause_tap in main:
    main = main.replace(old_pause_tap, new_pause_tap)
else:
    main = main.replace(old_pause_tap.replace('\n', '\r\n'), new_pause_tap.replace('\n', '\r\n'))

# 5. Handle STAGE_PICK_BUTTONS and direct island taps in onTap
old_menu_tap = """  if (mode === 'MENU') {
    if (x === null) return;
    // A fresh press always clears the previous gesture's "was this a
    // scroll drag" flag immediately (not just next frame via update()) —
    // otherwise a very quick tap right after a drag could still read the
    // old drag's mapMoved=true and get silently ignored.
    mapMoved = false;"""

new_menu_tap = """  if (mode === 'MENU') {
    if (x === null) return;
    mapMoved = false;

    // Quick Stage Pick buttons (1-12)
    for (const b of STAGE_PICK_BUTTONS) {
      if (hit(b, x, y)) {
        audio.pick();
        continueDismissed = true;
        newGame(b.level);
        mode = 'PLAYING';
        syncBanner();
        return;
      }
    }

    // Direct tap on any stage island
    const layout = homeLayout(mapScrollY);
    for (let i = 0; i < layout.rows.length; i++) {
      if (hit(layout.rows[i], x, y)) {
        audio.pick();
        continueDismissed = true;
        newGame(i * STAGE_SIZE);
        mode = 'PLAYING';
        syncBanner();
        return;
      }
    }"""

if old_menu_tap in main:
    main = main.replace(old_menu_tap, new_menu_tap)
else:
    main = main.replace(old_menu_tap.replace('\n', '\r\n'), new_menu_tap.replace('\n', '\r\n'))

with open('game/src/main.js', 'w', encoding='utf-8') as f:
    f.write(main)
print("Updated game/src/main.js successfully")
